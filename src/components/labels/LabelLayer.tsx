"use client";

import { useEffect, useState } from "react";
import type { BuildingData, ChildData } from "@/lib/world-types";
import { useWorld } from "@/store/world";
import { dayPart } from "@/lib/daytime";
import { elementRef } from "./labelBus";

/* ---------------- Biển tên trên nóc tòa nhà ---------------- */

function BuildingLabel({ b }: { b: BuildingData }) {
  const hovered = useWorld((s) => s.hoveredBuildingId === b.id);
  const selected = useWorld((s) => s.selectedBuildingId === b.id);
  const progress = Math.min(100, Math.round((b.raisedAmount / b.goalAmount) * 100));
  const hot = hovered || selected;
  return (
    <div ref={elementRef(`b:${b.id}`)} data-scale="70" className="absolute left-0 top-0" style={{ display: "none" }}>
      <div style={{ transformOrigin: "50% 100%" }}>
        <div
          className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-[13px] font-bold shadow-lg transition-colors ${
            hot ? "border-white/40 bg-red-500/95 text-white" : "border-white/20 bg-[#16161d]/80 text-[#ffe9d6]"
          }`}
        >
          {b.source === "COMMUNITY" && <span className="mr-1">😈</span>}
          {b.name}
          <span className="ml-1.5 font-normal opacity-80">{progress}%</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Trẻ em: thẻ chỉ số + bong bóng thoại ---------------- */

const LINES = {
  hungry: [
    "Cháu đói quá...",
    "Bụng cháu kêu ọc ọc rồi...",
    "Cô chú ơi, cho cháu xin miếng bánh mì...",
    "Hôm qua cháu chưa được ăn gì cả...",
  ],
  thirsty: [
    "Cháu khát nước quá...",
    "Giếng cạn mất rồi, cháu khát lắm...",
    "Cho cháu xin một ngụm nước với ạ...",
    "Cổ họng cháu khô khốc...",
  ],
  sad: [
    "Cháu buồn quá...",
    "Bao giờ cây mới xanh lại hả cô chú?",
    "Tòa nhà kia ồn quá, cháu không ngủ được...",
    "Cháu nhớ con suối ngày xưa...",
  ],
  happy: [
    "Cháu cảm ơn cô chú nhiều ạ!",
    "Hôm nay cháu được ăn no rồi!",
    "Cây xanh đẹp quá!",
    "Lớn lên cháu sẽ trồng thật nhiều cây!",
  ],
  night: ["Trời tối rồi, cháu sợ quá...", "Đèn tòa nhà kia chói mắt quá...", "Sao trên trời đẹp ghê..."],
  fed: ["Ngon quá! Cháu cảm ơn ạ! 💚", "Ôi, cháu vui quá!", "Cháu sẽ nhớ cô chú mãi!"],
};

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chooseLine(c: ChildData, hour: number): string {
  const needs: string[][] = [];
  if (c.hunger < 40) needs.push(LINES.hungry, LINES.hungry);
  if (c.thirst < 40) needs.push(LINES.thirsty, LINES.thirsty);
  if (c.joy < 30) needs.push(LINES.sad);
  if (dayPart(hour) === "night") needs.push(LINES.night);
  if (needs.length === 0) needs.push(LINES.happy);
  return pick(pick(needs));
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-[5px] w-[70px] rounded bg-white/25">
      <div
        className="h-full rounded transition-[width] duration-700"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

function ChildLabel({ c, hour }: { c: ChildData; hour: number }) {
  const hovered = useWorld((s) => s.hoveredChildId === c.id);
  const selected = useWorld((s) => s.selectedChildId === c.id);
  const celebrateAt = useWorld((s) => s.celebrating[c.id]);
  const [bubble, setBubble] = useState<string | null>(null);

  // nói chuyện định kỳ, so le giữa các em
  useEffect(() => {
    let alive = true;
    let hideT: ReturnType<typeof setTimeout>;
    let nextT: ReturnType<typeof setTimeout>;
    const speak = () => {
      if (!alive) return;
      setBubble(chooseLine(c, hour));
      hideT = setTimeout(() => alive && setBubble(null), 4200);
      nextT = setTimeout(speak, 9000 + Math.random() * 11000);
    };
    nextT = setTimeout(speak, 1500 + Math.random() * 8000);
    return () => {
      alive = false;
      clearTimeout(hideT);
      clearTimeout(nextT);
    };
    // nói lại theo chỉ số mới khi chỉ số thay đổi
  }, [c, hour]);

  // vừa được cho ăn → cảm ơn ngay
  useEffect(() => {
    if (!celebrateAt) return;
    setBubble(pick(LINES.fed));
    const t = setTimeout(() => setBubble(null), 4000);
    return () => clearTimeout(t);
  }, [celebrateAt]);

  const sad = c.hunger < 25 || c.thirst < 25;
  const showStats = hovered || selected;

  return (
    <div ref={elementRef(`c:${c.id}`)} data-scale="34" data-maxdist="95" className="absolute left-0 top-0" style={{ display: "none" }}>
      <div style={{ transformOrigin: "50% 100%" }} className="flex flex-col items-center">
        {showStats ? (
          <div className="flex flex-col gap-[3px] whitespace-nowrap rounded-xl border border-white/20 bg-[#101814]/90 px-2.5 py-1.5 text-xs text-white shadow-lg">
            <strong>
              {c.name} {sad ? "😢" : "🙂"}
            </strong>
            <span className="flex items-center gap-1.5">
              🍞 <Bar value={c.hunger} color="#f4a261" />
            </span>
            <span className="flex items-center gap-1.5">
              💧 <Bar value={c.thirst} color="#4cc9f0" />
            </span>
            <span className="flex items-center gap-1.5">
              😊 <Bar value={c.joy} color="#80ed99" />
            </span>
          </div>
        ) : bubble ? (
          <div
            key={bubble}
            className="relative max-w-[190px] rounded-2xl bg-white px-3 py-1.5 text-center text-[13px] font-medium leading-snug text-[#2a1d12] shadow-xl"
            style={{ animation: "bubblePop 0.25s ease-out" }}
          >
            <span className="mr-1 font-bold text-[#b5651d]">{c.name}:</span>
            {bubble}
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function LabelLayer({
  buildings,
  childList,
  hour,
}: {
  buildings: BuildingData[];
  childList: ChildData[];
  hour: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
      {buildings
        .filter((b) => b.status === "STANDING")
        .map((b) => (
          <BuildingLabel key={b.id} b={b} />
        ))}
      {childList.map((c) => (
        <ChildLabel key={c.id} c={c} hour={hour} />
      ))}
    </div>
  );
}
