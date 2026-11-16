# Starts the tooktale demo: finds this machine's Wi-Fi/LAN IP, then runs docker compose.
# Keep this file ASCII only: Windows PowerShell 5.1 misreads UTF-8 without a BOM.
param([switch]$Build, [switch]$NoOpen)
Set-Location $PSScriptRoot

$ip = (Get-NetIPConfiguration |
  Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
  Sort-Object { $_.InterfaceAlias -notlike 'Wi-Fi*' } |
  Select-Object -First 1).IPv4Address.IPAddress
if (-not $ip) { $ip = 'localhost' }
"LAN_IP=$ip" | Set-Content -Encoding ascii .env

$hasImage = docker images -q tooktale-demo:latest
if ($Build -or -not $hasImage) {
  docker compose up -d --build
} else {
  docker compose up -d
}
if ($LASTEXITCODE -ne 0) { throw 'docker compose failed. Is Docker Desktop running?' }

Write-Host ''
Write-Host "Open on this computer:  http://${ip}:4100" -ForegroundColor Green
Write-Host 'Phones must be on the same Wi-Fi. Scan the QR codes on that page.'
if (-not $NoOpen) { Start-Process "http://${ip}:4100" }
