"use client";

import { useEffect, useState } from "react";

export type DayPart = "dawn" | "morning" | "noon" | "afternoon" | "dusk" | "night";

export const DAY_PART_LABEL: Record<DayPart, string> = {
  dawn: "🌄 Bình minh",
  morning: "🌅 Buổi sáng",
  noon: "☀️ Buổi trưa",
  afternoon: "🌤️ Buổi chiều",
  dusk: "🌇 Hoàng hôn",
  night: "🌙 Ban đêm",
};

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 6.5) return "dawn";
  if (hour >= 6.5 && hour < 10.5) return "morning";
  if (hour >= 10.5 && hour < 14) return "noon";
  if (hour >= 14 && hour < 17.3) return "afternoon";
  if (hour >= 17.3 && hour < 18.8) return "dusk";
  return "night";
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Vị trí mặt trời, độ sáng, độ "giờ vàng" theo giờ thực (0..24) */
export function sunState(hour: number) {
  const angle = ((hour - 6) / 12) * Math.PI; // 0 lúc 6h (đông), π lúc 18h (tây)
  const elevation = Math.sin(angle);
  const daylight = smoothstep(-0.12, 0.3, elevation);
  const golden = elevation > -0.12 ? Math.max(0, 1 - Math.abs(elevation - 0.08) / 0.28) : 0;
  const sunPos: [number, number, number] = [Math.cos(angle) * 120, elevation * 90, -45];
  return { elevation, daylight, golden, sunPos };
}

/**
 * Giờ thực của người xem (float 0..24), cập nhật mỗi 30s.
 * Cho phép ghi đè để thử: thêm ?hour=20 vào URL.
 */
export function useRealHour(): number {
  const read = () => {
    if (typeof window !== "undefined") {
      const o = new URLSearchParams(window.location.search).get("hour");
      if (o !== null && !Number.isNaN(Number(o))) return ((Number(o) % 24) + 24) % 24;
    }
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  };
  const [hour, setHour] = useState(12);
  useEffect(() => {
    setHour(read());
    const t = setInterval(() => setHour(read()), 30000);
    return () => clearInterval(t);
  }, []);
  return hour;
}

/** Trạng thái môi trường dùng chung trong vòng lặp render (không gây re-render) */
export const envState = { daylight: 1 };
