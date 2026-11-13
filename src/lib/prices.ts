import { prisma } from "./db";
import { DESTRUCTION_LEVELS, type DestructionLevel } from "./format";

/** Giới hạn giá admin được đặt (đồng). Bội số 100 vì 1 nhân đạo = 100đ. */
export const ITEM_PRICE_MIN = 1_000;
export const ITEM_PRICE_MAX = 10_000_000;
export const LEVEL_PRICE_MIN = 5_000;
export const LEVEL_PRICE_MAX = 50_000_000;

/** Các mức hủy diệt với giá hiện hành (giá admin đặt trong DB, thiếu thì dùng mặc định). */
export async function getDestructionLevels(): Promise<DestructionLevel[]> {
  const rows = await prisma.levelPrice.findMany();
  const price = new Map(rows.map((r) => [r.id, r.amount]));
  return DESTRUCTION_LEVELS.map((l) => ({ ...l, amount: price.get(l.id) ?? l.amount }));
}

/** Trả lỗi tiếng Việt nếu giá không hợp lệ, null nếu ổn. */
export function priceError(amount: unknown, min: number, max: number): string | null {
  if (typeof amount !== "number" || !Number.isInteger(amount)) return "Giá phải là số nguyên";
  if (amount < min || amount > max)
    return `Giá phải từ ${min.toLocaleString("vi-VN")}đ đến ${max.toLocaleString("vi-VN")}đ`;
  if (amount % 100 !== 0) return "Giá phải là bội số của 100đ (1 nhân đạo)";
  return null;
}
