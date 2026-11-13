/** Tiện ích dựng tòa nhà rác dùng chung cho kẻ xấu (/api/sabotage) và admin. */

/** Giá tự đặt cho một tòa (đồng): tối thiểu 10.000đ = 100 hủy diệt. */
export const CUSTOM_PRICE_MIN = 10_000;
export const CUSTOM_PRICE_MAX = 50_000_000;

function hashStr(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** "Tội trạng" ngẫu nhiên nhưng ổn định theo tên; sức hủy diệt càng lớn, tội càng nặng. */
export function makeCrimes(name: string, goalAmount: number): string {
  const h = hashStr(name);
  const scale = goalAmount / 50000;
  return JSON.stringify({
    waterPerDay: Math.round((20000 + (h % 40) * 500) * scale),
    powerPerDay: Math.round((800 + (h % 37) * 20) * scale),
    landTaken: Math.round((350 + (h % 23) * 15) * scale),
  });
}

export const DEFAULT_SLOGAN = "Không ai biết nó dùng để làm gì.";

export function defaultLore(name: string, villainName: string | null): string {
  return `Một đêm nọ, ${villainName ? `kẻ tên ${villainName}` : "một kẻ giấu mặt"} lặng lẽ đổ bê tông giữa ruộng ngô của làng và dựng lên "${name}". Không ai biết nó làm gì — chỉ biết từ ngày nó mọc lên, quạt tản nhiệt rít suốt đêm và giếng làng cạn thêm một gang tay.`;
}

/** Chuẩn hóa chữ người dùng nhập: NFC, gộp khoảng trắng, cắt độ dài. */
export function cleanText(v: unknown, max: number): string {
  return typeof v === "string" ? v.normalize("NFC").trim().replace(/\s+/g, " ").slice(0, max) : "";
}
