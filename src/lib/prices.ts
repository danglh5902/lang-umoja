import { prisma } from "./db";
import { DESTRUCTION_LEVELS, toUnits, type DestructionLevel } from "./format";

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

/**
 * Trả lỗi tiếng Việt nếu giá không hợp lệ, null nếu ổn.
 * `unit`: "vnd" cho trang admin; "hủy diệt"/"nhân đạo" cho trang công khai
 * (ký hiệu "đ" chỉ được hiện trong hộp QR và trang admin).
 */
export function priceError(
  amount: unknown,
  min: number,
  max: number,
  unit: "vnd" | "hủy diệt" | "nhân đạo" = "vnd"
): string | null {
  const fmt = (v: number) =>
    unit === "vnd" ? `${v.toLocaleString("vi-VN")}đ` : `${toUnits(v).toLocaleString("vi-VN")} ${unit}`;
  if (typeof amount !== "number" || !Number.isInteger(amount)) return "Giá phải là số nguyên";
  if (amount < min || amount > max) return `Phải từ ${fmt(min)} đến ${fmt(max)}`;
  if (amount % 100 !== 0)
    return unit === "vnd" ? "Giá phải là bội số của 100đ (1 nhân đạo)" : `Phải là số ${unit} nguyên`;
  return null;
}
