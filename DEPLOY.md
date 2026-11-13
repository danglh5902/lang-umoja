# 🚀 Hướng dẫn deploy Mầm Xanh Umoja lên VPS + CI/CD GitHub Actions

## Sơ đồ

```
git push main ──▶ GitHub Actions
                   ├─ CI: typecheck · lint · build thử
                   └─ CD: build Docker image ──▶ ghcr.io/danglh5902/lang-umoja
                                                   │
                         SSH vào VPS ◀─────────────┘
                         docker compose pull && up -d

VPS (/opt/umoja)
  ├─ caddy  : cổng 80/443, tự cấp HTTPS cho tên miền ──▶ app:3000
  ├─ app    : Next.js (image ở trên), tự chạy `prisma migrate deploy` khi khởi động
  └─ data/  : file SQLite umoja.db (nằm ngoài container → deploy lại không mất dữ liệu)
```

Image được build trên GitHub (không build trên VPS) vì build Next + Three.js tốn nhiều RAM.

---

## Bước 1 — Trỏ tên miền về VPS

Ở trang quản lý DNS của tên miền, tạo 2 bản ghi:

| Loại | Tên | Giá trị |
|---|---|---|
| A | `@` | IP của VPS |
| A | `www` | IP của VPS |

Kiểm tra (có thể mất vài phút đến vài giờ để DNS cập nhật):

```bash
nslookup ten-mien-cua-ban.vn
```

> Không dùng `www`? Xóa khối `www.{$DOMAIN}` trong `deploy/Caddyfile`, nếu không Caddy sẽ báo lỗi xin chứng chỉ cho `www`.

## Bước 2 — Chuẩn bị VPS (Ubuntu 22.04/24.04)

SSH vào VPS bằng tài khoản root:

```bash
ssh root@IP_VPS
```

Cài Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

Tạo user `deploy` (GitHub Actions sẽ đăng nhập bằng user này) và cho phép dùng Docker:

```bash
adduser --disabled-password --gecos "" deploy && usermod -aG docker deploy
```

Mở tường lửa cho SSH + web:

```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

> Nếu VPS có sẵn nginx/apache đang chiếm cổng 80/443, tắt chúng đi: `systemctl disable --now nginx apache2`.

## Bước 3 — Tạo SSH key cho GitHub Actions

Trên VPS (vẫn là root), tạo cặp khóa riêng cho việc deploy:

```bash
mkdir -p /home/deploy/.ssh && ssh-keygen -t ed25519 -N "" -C github-actions -f /home/deploy/.ssh/github_actions
```

```bash
cat /home/deploy/.ssh/github_actions.pub >> /home/deploy/.ssh/authorized_keys && chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

In khóa bí mật ra để dán vào GitHub ở Bước 5 (copy **toàn bộ**, kể cả dòng BEGIN/END):

```bash
cat /home/deploy/.ssh/github_actions
```

## Bước 4 — Thư mục chạy app trên VPS

```bash
mkdir -p /opt/umoja/data /opt/umoja/backups && chown -R deploy:deploy /opt/umoja && chown 1000:1000 /opt/umoja/data
```

(`1000` là user `node` bên trong container — cần quyền ghi vào `data/`.)

Từ **máy của bạn** (thư mục dự án), gửi 3 file cấu hình lên VPS:

```bash
scp deploy/docker-compose.yml deploy/Caddyfile deploy/.env.example root@IP_VPS:/opt/umoja/
```

Trên VPS, tạo file `.env` thật từ mẫu rồi sửa:

```bash
cd /opt/umoja && mv .env.example .env && nano .env
```

Cần sửa: `DOMAIN`, `SITE_URL`, `APP_IMAGE=ghcr.io/danglh5902/lang-umoja:latest`, và **đổi `ADMIN_PASSWORD`**.
`.env` chỉ nằm trên VPS — không bao giờ đưa lên GitHub.

## Bước 5 — Khai báo secret trên GitHub

Vào repo **danglh5902/lang-umoja → Settings → Secrets and variables → Actions → New repository secret**:

| Tên secret | Giá trị |
|---|---|
| `VPS_HOST` | IP của VPS |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | nội dung khóa bí mật in ra ở Bước 3 |
| `VPS_PORT` | *(chỉ cần nếu SSH không dùng cổng 22)* |

Không cần tạo token cho kho image — workflow dùng sẵn `GITHUB_TOKEN`.

## Bước 6 — Deploy lần đầu

Push code lên nhánh `main` (hoặc vào tab **Actions → CI/CD → Run workflow**). Theo dõi ở tab **Actions**:
job **Kiểm tra & build** chạy trước, qua rồi mới tới **Build image & deploy lên VPS**.

Sau khi deploy xong, **tạo dữ liệu ban đầu** (12 tòa, 8 em bé). Trên online, lệnh này chỉ chạy được khi database
còn trống — nếu đã có dữ liệu nó sẽ từ chối để bảo vệ các lượt ủng hộ thật (muốn làm lại từ đầu thật sự thì thêm
`-e FORCE_SEED=1` sau `exec`):

```bash
cd /opt/umoja && docker compose exec app npx prisma db seed
```

Mở `https://ten-mien-cua-ban.vn` — Caddy tự xin chứng chỉ HTTPS ở lần truy cập đầu (chờ ~30 giây).

Trang quản trị: `https://ten-mien-cua-ban.vn/tomocaigi/admin` (mật khẩu = `ADMIN_PASSWORD`).

## Bước 7 — Bật thanh toán thật (PayOS) khi sẵn sàng

1. Lấy Client ID / API Key / Checksum Key ở https://payos.vn.
2. Trên VPS, sửa `/opt/umoja/.env`: `PAYMENT_PROVIDER=payos` + 3 khóa `PAYOS_*`.
3. Khởi động lại app:

```bash
cd /opt/umoja && docker compose up -d
```

4. Trên dashboard PayOS, khai báo webhook: `https://ten-mien-cua-ban.vn/api/webhooks/payos`.

---

## Vận hành hằng ngày

Xem log app:

```bash
cd /opt/umoja && docker compose logs -f app
```

Sao lưu database (an toàn cả khi app đang chạy):

```bash
apt install -y sqlite3
```

```bash
sqlite3 /opt/umoja/data/umoja.db ".backup /opt/umoja/backups/umoja-$(date +%F).db"
```

Tự sao lưu lúc 3h sáng mỗi ngày — thêm dòng sau vào `crontab -e` (của root):

```
0 3 * * * sqlite3 /opt/umoja/data/umoja.db ".backup /opt/umoja/backups/umoja-$(date +\%F).db"
```

Quay lại phiên bản cũ: mỗi lần deploy có image gắn mã commit. Trong `.env` đổi
`APP_IMAGE=ghcr.io/danglh5902/lang-umoja:<mã-commit>` rồi chạy `docker compose up -d`.

Chuyển dữ liệu đang có ở máy dev lên VPS (tùy chọn, thay cho seed):

```bash
scp prisma/dev.db root@IP_VPS:/opt/umoja/data/umoja.db
```

```bash
chown 1000:1000 /opt/umoja/data/umoja.db && cd /opt/umoja && docker compose restart app
```

## Hai môi trường, hai database riêng

| | Local (`npm run dev`) | Online (VPS) |
|---|---|---|
| Database | `prisma/dev.db` trên máy | `/opt/umoja/data/umoja.db` |
| Nhận biết | HUD có nhãn "🧪 Môi trường thử", admin ghi LOCAL | admin ghi "🌐 ONLINE — dữ liệu thật" |
| `prisma db seed` | chạy thoải mái | chỉ khi database trống (hoặc `FORCE_SEED=1`) |
| Nút "Phá nhanh (test)" | có | tắt (bật bằng `ENABLE_TEST_TOOLS=1` trong `.env`) |

Git chỉ chở code, không chở dữ liệu: `prisma/dev.db` bị `.gitignore` chặn, nên hai bên không bao giờ ghi đè nhau.

## Lưu ý

- App chạy **một instance** (SQLite + luồng realtime SSE lưu trong bộ nhớ). Muốn chạy nhiều server cần chuyển
  sang PostgreSQL và Redis pub/sub (xem README).
- Đổi tên miền: sửa `DOMAIN` và `SITE_URL` trong `.env` rồi `docker compose up -d`.
- Biến `SITE_URL` đọc lúc chạy, không cần build lại khi đổi.
