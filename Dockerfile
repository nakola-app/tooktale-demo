# ทุกแอปสร้างจาก image เดียว แต่รันแยก container / แยกพอร์ต
FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY hub/package.json hub/
COPY tooktale/package.json tooktale/
COPY tooktale-partner/package.json tooktale-partner/
COPY tooktale-runner/package.json tooktale-runner/
COPY nakola-tooktale/package.json nakola-tooktale/
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm
WORKDIR /app
ENV TZ=Asia/Bangkok NODE_ENV=production
COPY serve.mjs ./
COPY api ./api
COPY --from=build /app/hub/dist ./hub/dist
COPY --from=build /app/tooktale/dist ./tooktale/dist
COPY --from=build /app/tooktale-partner/dist ./tooktale-partner/dist
COPY --from=build /app/tooktale-runner/dist ./tooktale-runner/dist
COPY --from=build /app/nakola-tooktale/dist ./nakola-tooktale/dist
