/**
 * Phân biệt 2 môi trường — mỗi môi trường có database SQLite riêng, không đồng bộ:
 *   - Local (npm run dev):   prisma/dev.db         — dữ liệu thử, phá thoải mái
 *   - Online (Docker trên VPS, NODE_ENV=production): /app/data/umoja.db — dữ liệu thật
 */
export function isProduction() {
  return process.env.NODE_ENV === "production";
}

/** Công cụ test (phá nhanh, tạo lượt góp giả) chỉ bật ở local, trừ khi ENABLE_TEST_TOOLS=1 */
export function testToolsEnabled() {
  return !isProduction() || process.env.ENABLE_TEST_TOOLS === "1";
}
