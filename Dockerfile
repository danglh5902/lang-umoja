# ---------- build ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# công cụ biên dịch phòng khi better-sqlite3 không có bản dựng sẵn
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# ---------- chạy ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_PATH=/app/data/umoja.db

# giữ nguyên node_modules đầy đủ: cần Prisma CLI để chạy migrate/seed trong container
COPY --from=builder /app ./
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000

# mỗi lần khởi động: áp dụng migration mới (an toàn, không xóa dữ liệu) rồi chạy server
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start"]
