/** Chăm sóc miễn phí: ai cũng làm được, hiệu quả nhỏ hơn quà trả tiền, có thời gian chờ. */
export const CARE_ACTIONS = {
  water: { emoji: "💧", label: "Múc nước giúp em", log: "múc nước giúp", hunger: 0, thirst: 10, joy: 2 },
  fruit: { emoji: "🍎", label: "Hái quả rừng cho em", log: "hái quả rừng cho", hunger: 6, thirst: 0, joy: 2 },
  play: { emoji: "🤗", label: "Chơi cùng em", log: "chơi cùng", hunger: 0, thirst: 0, joy: 10 },
} as const;

export type CareKind = keyof typeof CARE_ACTIONS;

export const CARE_COOLDOWN_MS = 45_000;

/** Đập búa miễn phí: mỗi nhát = 1 nhân đạo (100đ trong DB), tối đa 10% sức hủy diệt mỗi tòa. */
export const FREE_HIT_AMOUNT = 100;
export const FREE_HIT_COOLDOWN_MS = 45_000;
export const FREE_MAX_SHARE = 0.1;

/** Quy tắc cho ăn/uống: chỉ nhận món khi chỉ số chính của món đó còn dưới ngưỡng này. */
export const NEED_BELOW = 85;
/** Mỗi người (IP) tặng tối đa chừng này món cho cùng một em trong 1 giờ. */
export const FEED_PER_HOUR = 6;

type Stat = "hunger" | "thirst" | "joy";
export type Stats = Record<Stat, number>;

const STAT_LABEL: Record<Stat, string> = { hunger: "no", thirst: "đủ nước", joy: "vui" };

/** Chỉ số mà món/hành động tác động mạnh nhất. */
export function primaryStat(e: Stats): Stat {
  return (["hunger", "thirst", "joy"] as Stat[]).reduce((a, b) => (e[b] > e[a] ? b : a));
}

/** Trả về lý do từ chối (tiếng Việt) hoặc null nếu em đang cần món này. */
export function refuseReason(childName: string, current: Stats, effect: Stats): string | null {
  const stat = primaryStat(effect);
  if (current[stat] >= NEED_BELOW) {
    return current[stat] >= 100
      ? `${childName} đã ${STAT_LABEL[stat]} hết cỡ rồi!`
      : `${childName} đang khá ${STAT_LABEL[stat]} rồi (${current[stat]}/100), lát nữa hãy tặng nhé.`;
  }
  return null;
}
