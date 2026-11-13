# 🌱 Mầm Xanh Umoja

Website gây quỹ dạng game 3D: ngôi làng châu Phi hư cấu bị các **dự án rác AI** (châm biếm, 100% hư cấu)
chiếm đất, hút nước làm mát server khiến trẻ em thiếu ăn thiếu nước. Người dùng:

- ⚒️ **Quyên góp phá dỡ** từng tòa nhà (mỗi tòa có mã QR ủng hộ riêng) → tòa sụp, cây xanh mọc lên
- 🍞 **Nuôi trẻ**: mua bánh mì, nước sạch, sách... — chỉ số No/Khát/Vui tăng, trẻ lớn lên theo 3 giai đoạn
- 😈 **Phá hủy làng** (`/sabotage`): đóng vai kẻ xấu, trả 50.000đ để dựng một tòa nhà rác (hư cấu) mang tên mình
  đặt — tòa trồi lên ngay giữa làng, tên khắc trên biển hiệu trước cổng; admin có thể gỡ tòa vi phạm
- 🏆 **Bảng Vinh Danh** & 💀 **Bảng Kẻ Xấu** giữa làng: người ủng hộ + tổng tiền (bấm để xem chi tiết),
  các tòa rác + thời gian chúng đã tồn tại
- 💬 Trẻ em nói chuyện bằng bong bóng thoại theo tình trạng ("Cháu đói quá...", "Cháu khát nước quá...")
- 🌗 Bầu trời sáng/trưa/chiều/tối theo giờ thực của người xem (thử giờ khác: thêm `?hour=20` vào URL)
- 🌍 **Endgame**: khi tòa cuối cùng sụp đổ, "Thế Giới Mới" mở ra — website phát cutscene kết, mọi
  đường dẫn chuyển về `/epilogue`, API ghi trả 410. Website tự hoàn thành sứ mệnh và "ngủ yên".

**Đơn vị trong game** (tiền vẫn lưu bằng đồng, chỉ quy đổi khi hiển thị): phe tốt góp **nhân đạo**,
kẻ xấu tung **hủy diệt** — quy ước 1.000đ = 10 nhân đạo = 10 hủy diệt. Kẻ xấu chọn 1 trong 4 mức hủy diệt
(Quấy Rối 500 · Tàn Phá 1.000 · Hủy Diệt 2.000 · Tận Thế 5.000); đó là sức hủy diệt của tòa — dân làng cần
góp đủ bấy nhiêu nhân đạo để phá. Đổi tỉ lệ ở `VND_PER_UNIT` trong `src/lib/format.ts`.

Âm thanh (tổng hợp bằng Web Audio, không cần file): hiệu ứng khi góp búa / tặng quà / sụp đổ / xây tòa,
và âm thanh nền của làng (gió, kalimba, chim/dế theo giờ, tiếng ù server theo số tòa rác).

Cốt truyện chia 4 hồi theo tiến độ phá dỡ (Bụi → Mầm → Suối → Thế Giới Mới): trời, đất, nước giếng
và nhạc nền của thế giới 3D đổi theo từng hồi.

## Chạy dev

```bash
npm install
npx prisma migrate dev   # tạo DB SQLite (prisma/dev.db)
npx prisma db seed       # 12 dự án rác + 8 trẻ em + 5 vật phẩm
npm run dev              # http://localhost:3000
```

Mặc định `PAYMENT_PROVIDER=mock`: QR là giả, bấm nút **"Tôi đã chuyển khoản (giả lập)"** để xác
nhận — không có tiền thật nào di chuyển.

## Trang

| Đường dẫn | Mô tả |
|---|---|
| `/` | Thế giới 3D + HUD cốt truyện |
| `/b/<slug>` | Poster + QR tĩnh riêng của từng tòa nhà (in/chia sẻ được) |
| `/sabotage` | "Phá hủy làng" — kẻ xấu trả phí dựng tòa nhà rác |
| `/tomocaigi/admin` | Hội đồng làng: gỡ tòa của kẻ xấu, xem giao dịch, nút "Phá nhanh (test)" |
| `/epilogue` | Trang kết — chỉ đầy đủ sau khi tòa cuối cùng sụp đổ |

Admin đăng nhập bằng `ADMIN_PASSWORD` trong `.env` (mặc định dev: `umoja-admin` — **đổi khi deploy**).

## Deploy lên VPS + CI/CD

Xem **[DEPLOY.md](DEPLOY.md)** (Docker + Caddy HTTPS + GitHub Actions).

## Bật thanh toán thật (PayOS)

1. Đăng ký https://payos.vn, lấy Client ID / API Key / Checksum Key (sandbox hoặc production).
2. Trong `.env`: `PAYMENT_PROVIDER=payos` + điền 3 key `PAYOS_*` + `SITE_URL=https://domain-cua-ban`.
3. Khai báo webhook URL trên dashboard PayOS: `https://domain-cua-ban/api/webhooks/payos`.
   (Chạy local có thể dùng tunnel như cloudflared/ngrok để nhận webhook.)

Tiền về tài khoản ngân hàng liên kết PayOS; webhook xác nhận tự động → tiến độ cập nhật realtime (SSE).

## Chuyển sang PostgreSQL khi deploy

1. `prisma/schema.prisma`: đổi `provider = "sqlite"` → `"postgresql"`.
2. `prisma.config.ts`: đổi `datasource.url` sang chuỗi kết nối Postgres (đọc từ env).
3. Thay adapter trong `src/lib/db.ts` + `prisma/seed.ts`: dùng `@prisma/adapter-pg` thay cho
   `@prisma/adapter-better-sqlite3`.
4. `npx prisma migrate dev` lại từ đầu (xóa thư mục `prisma/migrations` cũ nếu cần).

Lưu ý khi scale nhiều instance: SSE emitter đang là in-memory — cần chuyển qua Redis pub/sub
nếu chạy >1 server.

## Chơi lại từ đầu (sau sunset hoặc để test)

```bash
npx prisma db seed
```

## Pháp lý & nội dung

Mọi "dự án rác AI" trong game là **hư cấu châm biếm**. Form tố giác có cảnh báo và quy trình
kiểm duyệt admin để chặn nội dung nêu đích danh dự án/công ty/cá nhân có thật (tránh rủi ro bôi nhọ).
Nếu gây quỹ thật, cần minh bạch mục đích sử dụng tiền và tuân thủ quy định về quyên góp từ thiện.
