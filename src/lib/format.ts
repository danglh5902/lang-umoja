/** Tên hiển thị cho các lượt ủng hộ không ghi tên */
export const ANONYMOUS_NAME = "Người ẩn danh";

/*
 * Đơn vị trong thế giới Umoja — mọi số tiền vẫn LƯU bằng đồng (VND),
 * chỉ quy đổi lúc hiển thị:
 *   1.000đ góp cho làng   = 10 nhân đạo
 *   1.000đ kẻ xấu bỏ ra   = 10 hủy diệt
 * Mỗi tòa nhà rác có "sức hủy diệt" = số nhân đạo dân làng cần góp để phá nó.
 */
export const KIND_UNIT = "nhân đạo";
export const DESTROY_UNIT = "hủy diệt";
export const VND_PER_UNIT = 100;

/** đồng → nhân đạo / hủy diệt */
export const toUnits = (vnd: number) => Math.round(vnd / VND_PER_UNIT);
/** nhân đạo / hủy diệt → đồng */
export const fromUnits = (units: number) => Math.round(units * VND_PER_UNIT);

const num = (n: number) => n.toLocaleString("vi-VN");

/** Tiền thật (chỉ dùng ở chỗ chuyển khoản) */
export function formatVnd(n: number) {
  return `${num(n)}đ`;
}

/** Số nhân đạo (nhận vào số đồng) — đơn vị của phe tốt */
export function formatKind(vnd: number) {
  return `${num(toUnits(vnd))} ${KIND_UNIT}`;
}

/** Số hủy diệt (nhận vào số đồng) — đơn vị của phe xấu */
export function formatDestroy(vnd: number) {
  return `${num(toUnits(vnd))} ${DESTROY_UNIT}`;
}

/** Rút gọn cho chỗ hẹp (nhận vào số đồng): 2,5k nhân đạo, 1,2tr hủy diệt */
export function formatShort(vnd: number, unit: string) {
  const n = toUnits(vnd);
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr ${unit}`;
  if (n >= 1000) return `${(n / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}k ${unit}`;
  return `${num(n)} ${unit}`;
}

/** Các mức hủy diệt kẻ xấu chọn khi dựng tòa nhà rác */
export const DESTRUCTION_LEVELS = [
  {
    id: 1,
    name: "Quấy Rối",
    emoji: "😈",
    amount: 50000,
    desc: "Một tòa nhỏ, đủ làm lũ trẻ mất ngủ vì tiếng quạt server.",
  },
  {
    id: 2,
    name: "Tàn Phá",
    emoji: "👿",
    amount: 100000,
    desc: "Hút cạn một góc ruộng, khói xám phủ kín mái nhà.",
  },
  {
    id: 3,
    name: "Hủy Diệt",
    emoji: "💀",
    amount: 200000,
    desc: "Một pháo đài bê tông cao vút, nuốt nước của cả con suối.",
  },
  {
    id: 4,
    name: "Tận Thế",
    emoji: "☠️",
    amount: 500000,
    desc: "Tháp khổng lồ che khuất mặt trời. Cả làng phải đồng lòng mới hạ nổi.",
  },
] as const;

/** Một mức hủy diệt; `amount` (đồng) có thể bị admin đổi — lấy bản hiện hành bằng getDestructionLevels() */
export interface DestructionLevel {
  id: number;
  name: string;
  emoji: string;
  amount: number;
  desc: string;
}

/** Mức hủy diệt gần nhất với một sức hủy diệt bất kỳ (dùng cho tòa gốc của làng) */
export function destructionLevelFor(
  power: number,
  levels: readonly DestructionLevel[] = DESTRUCTION_LEVELS
): DestructionLevel {
  let best: DestructionLevel = levels[0];
  for (const l of levels) if (power >= l.amount) best = l;
  return best;
}

/** "3 ngày 4 giờ", "5 giờ 12 phút", "8 phút", "vài giây" */
export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${mins} phút`;
  if (mins > 0) return `${mins} phút`;
  return "vài giây";
}
