# Mầm Xanh Umoja — bối cảnh dự án cho Claude

@AGENTS.md

Người dùng là người Việt — **luôn trả lời bằng tiếng Việt**. Mọi chữ hiển thị trên site là tiếng Việt có dấu.

## Dự án là gì

Website gây quỹ dạng **game 3D** (Next.js + React Three Fiber). Làng Umoja (châu Phi, hư cấu) bị các
**"dự án rác AI"** — 100% hư cấu, châm biếm — chiếm đất, hút nước làm mát server; trẻ em thiếu ăn, thiếu nước.

- **Phe tốt** góp **nhân đạo** để phá tòa nhà rác (tòa sụp → cây mọc, đất xanh lan ra) và nuôi 8 em bé
  (bánh mì, nước, cháo, sách, đồ chơi → chỉ số No/Khát/Vui, lớn lên 3 giai đoạn).
- **Phe xấu** (`/sabotage` — "Phá hủy làng") trả tiền chọn **sức hủy diệt** (4 mức) để dựng tòa rác mang tên mình;
  tòa trồi lên ngay giữa làng, tên khắc trên biển hiệu trước cổng.
- Giữa làng có **Bảng Vinh Danh** (người góp + tổng nhân đạo, bấm xem chi tiết) và **Bảng Kẻ Xấu** (tòa rác +
  thời gian tồn tại).
- **Endgame**: tòa cuối cùng sụp → cutscene → website "chết": mọi route chuyển về `/epilogue`, API ghi trả 410.
- Cốt truyện 4 hồi theo tỉ lệ tòa đã phá: Bụi → Mầm → Suối → Thế Giới Mới (trời/đất/giếng/âm thanh đổi theo).
- Có intro điện ảnh 5 chương (camera bay, letterbox, chữ máy đánh, âm thanh Web Audio), trời theo **giờ thực**.

**Pháp lý**: không bao giờ dùng tên dự án/công ty/người có thật cho tòa nhà rác. Admin gỡ tòa vi phạm.

## Lệnh

```bash
npm install
npx prisma generate          # sinh client vào src/generated/prisma (bị gitignore)
npx prisma migrate dev       # tạo DB SQLite prisma/dev.db
npx prisma db seed           # ⚠️ XÓA SẠCH rồi tạo lại 12 tòa, 8 em bé, 5 món quà
npm run dev                  # http://localhost:3000
npx next typegen && npx tsc --noEmit   # typecheck (typegen sinh LayoutProps/PageProps)
npm run lint                 # 0 lỗi; ~25 cảnh báo React Compiler là cố ý (xem eslint.config.mjs)
npm run build
```

`.env` (copy từ `.env.example`): `DATABASE_PATH`, `PAYMENT_PROVIDER=mock|payos`, `PAYOS_*`, `ADMIN_PASSWORD`, `SITE_URL`.

## Kiến trúc

```
src/app/
  page.tsx                 trang làng (server: nếu đã sunset → redirect /epilogue)
  sabotage/                "Phá hủy làng" (kẻ xấu chọn sức hủy diệt + đặt tên)
  tomocaigi/admin/         trang quản trị (header x-admin-password) — đường dẫn cố ý khó đoán
  b/[slug]/                poster + QR tĩnh của từng tòa
  epilogue/                trang kết
  api/world                GET toàn bộ trạng thái thế giới (+ bảng vinh danh)
  api/events               SSE realtime (EventEmitter trong bộ nhớ → chỉ 1 instance)
  api/donations            POST tạo giao dịch DEMOLISH/FEED · GET ?orderCode trạng thái (+buildingId)
  api/sabotage             POST kẻ xấu dựng tòa (level 1..4)
  api/mock-pay             giả lập thanh toán (chỉ khi PAYMENT_PROVIDER=mock)
  api/webhooks/payos       webhook PayOS (verify chữ ký)
  api/honor                chi tiết 1 người trên bảng vinh danh
  api/admin/*              overview · fast-forward (phá nhanh để test) · buildings/[id] (gỡ tòa)
src/lib/
  game.ts                  ★ markDonationPaid(): mọi hiệu ứng khi thanh toán xong (idempotent, transaction)
  format.ts                ★ đơn vị nhân đạo/hủy diệt, DESTRUCTION_LEVELS, formatKind/formatDestroy
  payment/                 MockProvider | PayOSProvider (chọn bằng PAYMENT_PROVIDER)
  events.ts                kiểu WorldEvent + emitter SSE
  daytime.ts               giờ thực → vị trí mặt trời, envState.daylight dùng chung trong useFrame
  sfx.ts / ambient.ts      hiệu ứng âm thanh + âm thanh nền (Web Audio tổng hợp, không có file)
  introAudio.ts            nhạc intro/cutscene
  placement.ts             tìm ô trống cho tòa mới
src/store/world.ts         zustand: world, sự kiện SSE → applyEvent, lựa chọn, camera điện ảnh
src/components/world/      cảnh 3D: Terrain, BuildingMesh, ChildMesh, Village, VillageBoards, PhaseEnvironment…
src/components/labels/     nhãn DOM chiếu từ 3D (thay cho drei <Html>)
src/components/hud/        HUD, panel tòa/trẻ, QR modal, bảng, intro, cutscene, minimap
prisma/                    schema (SQLite), migrations, seed.ts
deploy/ + Dockerfile + .github/workflows/ci-cd.yml   → xem DEPLOY.md
```

## Quy ước & bẫy đã gặp (đọc trước khi sửa)

- **Tiền lưu bằng ĐỒNG trong DB**; chỉ đổi đơn vị lúc hiển thị: 1.000đ = 10 nhân đạo = 10 hủy diệt
  (`VND_PER_UNIT = 100` trong `src/lib/format.ts`). Luôn dùng `formatKind` / `formatDestroy` / `formatShort`.
  **Ký hiệu "đ" chỉ được xuất hiện trong hộp quét QR** (và trang admin nội bộ) — người dùng yêu cầu rõ.
- **Sức hủy diệt của tòa = `goalAmount`** = số nhân đạo cần góp để phá. Tòa của kẻ xấu: goal = phí đã trả.
- `totalRaised` chỉ gồm DEMOLISH + FEED (nhân đạo); phí kẻ xấu (`CONTRIBUTE_FEE`) tính riêng `totalDestroy`.
- Building `status`: `STANDING | DESTROYED | REMOVED` — mọi truy vấn/đếm phải loại `REMOVED`.
  `source`: `SEED` (tòa mẫu) | `ADMIN` (admin thêm) | `COMMUNITY` (kẻ xấu trả phí). Dựng tòa luôn qua
  `createBuilding()` trong `game.ts`. Giá tự đặt (kẻ xấu/admin) tối thiểu 10.000đ (`src/lib/buildings.ts`).
- Docker KHÔNG chạy seed. `ensureBaseData()` (`src/lib/bootstrap.ts`) tự tạo WorldState + em bé + quà khi
  bảng trống; tòa mẫu thì admin bấm "Nạp 12 tòa mẫu". Dữ liệu mặc định nằm ở `src/lib/defaults.ts`.
- Giá quà nằm ở bảng `Item`, giá mức hủy diệt ở `LevelPrice` (admin chỉnh); luôn đọc qua `getDestructionLevels()`.
- **Không dùng `<Html>` của drei**: với React 19 nó gây lỗi `removeChild` khi unmount. Dùng `labels/`:
  component 3D đăng ký `anchorRef(id)`, `LabelLayer` render DOM, `LabelProjector` chiếu vị trí mỗi frame.
- `reactStrictMode: false` (R3F + double-mount) — đừng bật lại.
- **Prisma 7**: URL DB nằm ở `prisma.config.ts` (không ở schema); client dùng adapter
  `PrismaBetterSqlite3` (đúng chữ hoa/thường này). Client sinh ra ở `src/generated/prisma`.
- **Không dùng `NEXT_PUBLIC_*` cho cấu hình server** — Next đóng băng giá trị lúc build (image Docker build trên
  CI). Dùng `SITE_URL` (đọc lúc chạy).
- **Docker**: image `node:*-slim` không có OpenSSL → phải `apt-get install openssl` ở CẢ stage build lẫn
  runner, và `COPY --chown=node:node`; thiếu thì `prisma migrate deploy` đoán sai OpenSSL, cố tải engine vào
  `node_modules` (không có quyền ghi) → container khởi động lại liên tục.
- `cacheComponents` đã tắt (app hoàn toàn dynamic, dùng `export const dynamic = "force-dynamic"`).
- Camera: `CameraRig` trong `WorldCanvas.tsx` — chọn tòa/em bé/bảng thì trượt khung hình về giữa; khi
  `cinematic` khác null thì khóa điều khiển. Rời intro bằng mọi đường phải `setCinematic(null)` (đã có cleanup).
- Tên người dùng được chuẩn hóa NFC phía server; lượt góp không tên hiện là "Người ẩn danh".
- Âm thanh chỉ phát sau thao tác đầu tiên của người xem (chính sách autoplay) — `installSfxUnlock()`.

## Hai môi trường (database tách biệt — người dùng yêu cầu)

- Local `npm run dev` → `prisma/dev.db` (dữ liệu thử). Online (Docker, `NODE_ENV=production`) → `/app/data/umoja.db`
  (dữ liệu thật). Không đồng bộ; `dev.db` không bao giờ lên git.
- `src/lib/env.ts`: `isProduction()`, `testToolsEnabled()`. Seed từ chối chạy trên online khi đã có dữ liệu
  (trừ `FORCE_SEED=1`); `/api/admin/fast-forward` tắt trên online (trừ `ENABLE_TEST_TOOLS=1`).
- HUD hiện nhãn "🧪 Môi trường thử" khi `NODE_ENV !== production`; admin hiện LOCAL/ONLINE.

## Kiểm thử thủ công nhanh

- Thanh toán giả lập: bấm "Tôi đã chuyển khoản (giả lập)" trong hộp QR (hoặc `POST /api/mock-pay {orderCode}`).
- Xem giờ khác: thêm `?hour=20` vào URL.
- Phá nhanh để test endgame: trang admin → "⏩ Phá nhanh (test)" (hoặc `POST /api/admin/fast-forward`).
- Xem lại intro: nút 📖 trên HUD (hoặc xóa `localStorage["umoja-intro-seen"]`).
- Sau khi test xong: xóa dữ liệu test cụ thể, **đừng seed lại** nếu người dùng đang có dữ liệu thật.
- Shell trên máy dev là Windows (Git Bash / PowerShell); heredoc chứa dấu nháy dễ lỗi → ghi script ra file.

## Deploy

VPS + Docker + Caddy (HTTPS tự động) + GitHub Actions (build image lên GHCR rồi SSH vào VPS).
Hướng dẫn đầy đủ: **DEPLOY.md**. Repo: https://github.com/danglh5902/lang-umoja (nhánh `main` → tự deploy).
