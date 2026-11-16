import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Copy, Link2, Plus, X } from 'lucide-react';
import { BikePhoto, Logo, PhotoStrip, Qr, Sheet, StatusChip, api, appUrl, baht, fmtDate, fmtRange, todayIso, useMeta } from '@tooktale/shared';
import { useShop } from './ctx.js';
import { AutoConfirmNote } from './booking.jsx';

export function ShopLink() {
  const { shop } = useShop();
  const meta = useMeta();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = meta ? appUrl(meta, 'tooktale', `/${shop.slug}`) : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* http บนมือถือคัดลอกไม่ได้ ก็แสดง URL ให้ดูแทน */ }
  };
  return (
    <>
      <button type="button" className="card card-link link-card row" onClick={() => setOpen(true)}>
        <Link2 size={20} />
        <span className="grow">
          <span className="bold" style={{ display: 'block' }}>ลิงก์หน้าร้านของคุณ</span>
          <span className="small muted">แปะบน Google หรือส่งใน WhatsApp ให้แขกจองเองได้</span>
        </span>
        <ArrowRight size={18} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="ลิงก์หน้าร้าน">
        <div className="stack center" style={{ alignItems: 'center' }}>
          <Qr value={url} size={220} />
          <p className="small muted" style={{ overflowWrap: 'anywhere' }}>{url}</p>
          <p className="tiny faint">ของจริงจะเป็นลิงก์ชื่อร้าน ตอนนี้ใช้ IP เครื่องเดโม่</p>
          <button type="button" className="btn btn-primary btn-block" onClick={copy}><Copy size={16} />{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</button>
        </div>
      </Sheet>
    </>
  );
}

function RequestCard({ b }) {
  const { shopId, refresh } = useShop();
  const [error, setError] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const decide = async (accept) => {
    try {
      await api.post(`/api/partner/${shopId}/bookings/${b.id}/decision`, { accept, reason });
      refresh();
    } catch (e) { setError(e.message); }
  };
  return (
    <div className="card stack-s task" data-testid="request-card">
      <Link to={`/booking/${b.id}`} style={{ textDecoration: 'none' }} className="stack-s">
        <div className="between"><span className="bold">{b.guest.name}</span><span className="chip chip-warn">คำขอจอง</span></div>
        <div className="small muted">{b.vehicle.name} · {b.vehicle.plate}</div>
        <div className="small muted">{fmtRange(b.from, b.to)} · {b.days} วัน · {baht(b.rentTotal)}</div>
        {(b.pickupPoint || b.dropoffPoint) && <div className="small"><span className="chip chip-accent">ส่งถึงจุด</span> {(b.pickupPoint || b.dropoffPoint).name}</div>}
      </Link>
      {error && <div className="callout callout-bad small">{error}</div>}
      <AutoConfirmNote b={b} />
      <div className="row">
        <button type="button" className="btn btn-primary grow" onClick={() => decide(true)}><Check size={17} />รับจอง</button>
        <button type="button" className="btn btn-ghost" onClick={() => setRejecting(true)}><X size={17} />ปฏิเสธ</button>
      </div>
      <Sheet open={rejecting} onClose={() => setRejecting(false)} title="ปฏิเสธคำขอ">
        <div className="field"><label htmlFor={`why-${b.id}`}>เหตุผล (แขกจะเห็น)</label><input id={`why-${b.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sorry, this bike is not available." /></div>
        <button type="button" className="btn btn-danger btn-block" onClick={() => decide(false)}>ยืนยันปฏิเสธ</button>
      </Sheet>
    </div>
  );
}

function ConfirmRunnerCard({ b, job }) {
  const { shopId, refresh } = useShop();
  const set = b.handoffs.find((h) => h.stage === 'shop_runner');
  return (
    <div className="card stack-s task" data-testid="confirm-runner">
      <div className="between"><span className="bold">ยืนยันมอบรถให้คนเดินรถ</span><span className="chip chip-coral">รอคุณ</span></div>
      <div className="small muted">{job.runner?.name} ถ่ายรูป {b.vehicle.name} ({b.vehicle.plate}) ตรงกับสภาพรถไหม</div>
      {set && <PhotoStrip vehicle={b.vehicle} photos={set.photos} />}
      <button type="button" className="btn btn-primary btn-block" onClick={async () => { await api.post(`/api/partner/${shopId}/jobs/${job.id}/confirm`); refresh(); }}><Check size={17} />ตรงกัน มอบรถ</button>
    </div>
  );
}

function Row({ b, sub, to }) {
  return (
    <Link to={to || `/booking/${b.id}`} className="card card-link row">
      <div style={{ width: 62, flex: 'none', borderRadius: 7, overflow: 'hidden' }}><BikePhoto vehicle={b.vehicle} caption={false} /></div>
      <div className="grow">
        <div className="between"><span className="bold clip">{b.guest.name}</span><StatusChip status={b.status} /></div>
        <div className="small muted clip">{b.vehicle.name} · {b.vehicle.plate}</div>
        <div className="small muted clip">{sub}</div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const { shop, bookings } = useShop();
  const nav = useNavigate();
  const today = todayIso();
  const requests = bookings.filter((b) => b.status === 'requested');
  const toConfirm = bookings.flatMap((b) => b.jobs
    .filter((j) => j.kind === 'deliver' && j.status === 'picked' && !j.shopConfirmedAt)
    .map((j) => ({ b, j })));
  const toCheck = bookings.filter((b) => b.status === 'returned'
    && (b.dropoff.mode === 'shop' || b.jobs.some((j) => j.kind === 'collect' && j.status === 'delivered')));
  const pickups = bookings.filter((b) => b.status === 'confirmed' && b.from <= today);
  const returns = bookings.filter((b) => b.status === 'active' && b.to <= today);
  const coming = bookings.filter((b) => b.status === 'confirmed' && b.from > today).sort((a, b) => a.from.localeCompare(b.from));
  const out = bookings.filter((b) => b.status === 'active');
  const legName = (b) => (b.pickupPoint ? `ส่งที่ ${b.pickupPoint.name}` : 'รับที่ร้าน');
  const nothing = !requests.length && !toConfirm.length && !toCheck.length;
  return (
    <>
      <header className="topbar"><div className="grow"><Logo suffix="partner" size={18} /></div><span className="small muted clip" style={{ maxWidth: 150 }}>{shop.name}</span></header>
      <main className="page page-tabbed">
        <div className="stat-grid">
          <div className="stat"><div className="label">รถออกอยู่ตอนนี้</div><div className="value">{out.length}</div></div>
          <div className="stat"><div className="label">คำขอรอตอบ</div><div className="value">{requests.length}</div></div>
        </div>
        <ShopLink />
        <button type="button" className="btn btn-ghost btn-block" onClick={() => nav('/walkin')}><Plus size={18} />คีย์แขก walk-in</button>

        {!nothing && <h2>ต้องทำตอนนี้</h2>}
        {requests.map((b) => <RequestCard key={b.id} b={b} />)}
        {toConfirm.map(({ b, j }) => <ConfirmRunnerCard key={j.id} b={b} job={j} />)}
        {toCheck.map((b) => <Row key={b.id} b={b} sub="รถกลับถึงร้านแล้ว ตรวจรูปแล้วปิดงาน" to={`/booking/${b.id}/return`} />)}

        <div className="stack">
          <h2>รับรถวันนี้</h2>
          {pickups.length === 0 && <p className="small faint">ไม่มี</p>}
          {pickups.map((b) => <Row key={b.id} b={b} sub={`${b.pickupTime} · ${legName(b)}`} />)}
        </div>
        <div className="stack">
          <h2>คืนรถวันนี้</h2>
          {returns.length === 0 && <p className="small faint">ไม่มี</p>}
          {returns.map((b) => <Row key={b.id} b={b} sub={`${b.returnTime} · ${b.dropoffPoint ? `รับคืนที่ ${b.dropoffPoint.name}` : 'คืนที่ร้าน'}`} />)}
        </div>
        {coming.length > 0 && (
          <div className="stack">
            <h2>เร็วๆ นี้</h2>
            {coming.slice(0, 5).map((b) => <Row key={b.id} b={b} sub={`${fmtDate(b.from)} · ${legName(b)}`} />)}
          </div>
        )}
      </main>
    </>
  );
}
