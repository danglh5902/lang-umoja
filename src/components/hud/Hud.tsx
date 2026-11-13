"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PHASE_INFO, type WorldData } from "@/lib/world-types";
import { useWorld } from "@/store/world";
import Minimap from "./Minimap";
import { DAY_PART_LABEL, dayPart } from "@/lib/daytime";
import { DESTROY_UNIT, KIND_UNIT, formatShort } from "@/lib/format";
import { installSfxUnlock, isSfxMuted, onSfxMutedChange, setSfxMuted } from "@/lib/sfx";

function SoundToggle() {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    installSfxUnlock();
    setMuted(isSfxMuted());
    return onSfxMutedChange(setMuted);
  }, []);
  return (
    <button
      onClick={() => setSfxMuted(!muted)}
      className="rounded-full bg-white/10 px-3 py-1 font-bold hover:bg-white/20"
      title={muted ? "Bật âm thanh" : "Tắt âm thanh"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

const TOAST_MS = 6000;
const FADE_MS = 800;

/** Thông báo nổi của làng: hiện ~6 giây rồi mờ dần và biến mất */
function VillageToasts() {
  const log = useWorld((s) => s.log);
  const [now, setNow] = useState(() => Date.now());
  const newest = log[0]?.at ?? 0;

  // chỉ chạy đồng hồ khi còn thông báo đang hiện
  useEffect(() => {
    if (Date.now() - newest > TOAST_MS) return;
    setNow(Date.now());
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() - newest > TOAST_MS) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, [newest]);

  const visible = log.filter((e) => now - e.at < TOAST_MS).slice(0, 4);
  return (
    <div className="absolute bottom-16 left-3 flex w-[min(380px,80vw)] flex-col-reverse gap-1">
      {visible.map((entry) => {
        const age = now - entry.at;
        const fading = age > TOAST_MS - FADE_MS;
        return (
          <div
            key={entry.id}
            className="rounded-lg bg-black/60 px-3 py-1.5 text-[12px] text-white/90 shadow-lg backdrop-blur-sm transition-all duration-700"
            style={{
              opacity: fading ? 0 : 1,
              transform: fading ? "translateX(-12px)" : "none",
              animation: "fadeUp 0.35s ease-out",
            }}
          >
            {entry.text}
          </div>
        );
      })}
    </div>
  );
}

export default function Hud({
  world,
  hour,
  onReplayIntro,
}: {
  world: WorldData;
  hour: number;
  onReplayIntro: () => void;
}) {
  const setOpenBoard = useWorld((s) => s.setOpenBoard);
  const hh = String(Math.floor(hour)).padStart(2, "0");
  const mm = String(Math.floor((hour % 1) * 60)).padStart(2, "0");
  const phase = PHASE_INFO[world.phase] ?? PHASE_INFO[1];
  const remaining = world.totalBuildings - world.destroyedCount;
  const destroyLeft = world.buildings
    .filter((b) => b.status === "STANDING")
    .reduce((a, b) => a + Math.max(0, b.goalAmount - b.raisedAmount), 0);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 font-sans">
      {/* Thanh trên */}
      <div className="pointer-events-auto absolute left-0 right-0 top-0 flex flex-wrap items-center gap-x-4 gap-y-1 bg-gradient-to-b from-black/70 to-transparent px-4 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌱</span>
          <span className="font-serif text-base font-black tracking-wide">Mầm Xanh Umoja</span>
          {process.env.NODE_ENV !== "production" && (
            <span
              className="rounded-full bg-sky-500/80 px-2 py-0.5 text-[10px] font-bold text-white"
              title="Đang chạy ở máy (npm run dev) — database riêng prisma/dev.db, không ảnh hưởng bản online"
            >
              🧪 Môi trường thử
            </span>
          )}
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/80" title="Bầu trời theo giờ thực của bạn">
          {DAY_PART_LABEL[dayPart(hour)]} · {hh}:{mm}
        </span>
        <div className="hidden items-center gap-1.5 text-xs text-amber-200/90 sm:flex">
          <span className="font-bold">{phase.act} — {phase.name}</span>
          <span className="text-white/40">·</span>
          <span className="italic text-white/60">{phase.tagline}</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="rounded-full bg-red-500/20 px-3 py-1 font-bold text-red-200" title="Tổng sức hủy diệt còn lại — cần chừng ấy nhân đạo để giải phóng làng">
            🏭 {remaining} tòa · 💀 {formatShort(destroyLeft, DESTROY_UNIT)}
          </span>
          <span className="hidden rounded-full bg-emerald-500/20 px-3 py-1 font-bold text-emerald-200 md:inline">
            💚 {formatShort(world.totalRaised, KIND_UNIT)}
          </span>
          <button
            onClick={() => setOpenBoard("honor")}
            className="rounded-full bg-amber-400/20 px-3 py-1 font-bold text-amber-200 hover:bg-amber-400/30"
            title="Bảng Vinh Danh"
          >
            🏆<span className="ml-1 hidden lg:inline">Vinh danh</span>
          </button>
          <button
            onClick={() => setOpenBoard("villain")}
            className="rounded-full bg-red-500/20 px-3 py-1 font-bold text-red-200 hover:bg-red-500/30"
            title="Bảng Kẻ Xấu"
          >
            💀<span className="ml-1 hidden lg:inline">Kẻ xấu</span>
          </button>
          <Link
            href="/sabotage"
            className="rounded-full bg-gradient-to-r from-red-600 to-red-800 px-3 py-1 font-bold text-white shadow-[0_0_14px_rgba(220,40,40,0.45)] hover:brightness-110"
          >
            😈 Phá hủy làng
          </Link>
          <SoundToggle />
          <button
            onClick={onReplayIntro}
            className="rounded-full bg-white/10 px-3 py-1 font-bold hover:bg-white/20"
            title="Xem lại câu chuyện"
          >
            📖
          </button>
        </div>
      </div>

      {/* Thanh tiến độ tổng — hành trình đến Thế Giới Mới */}
      <div className="pointer-events-auto absolute left-1/2 top-[72px] w-[min(440px,80vw)] -translate-x-1/2">
        <div className="flex justify-between text-[10px] font-bold text-white/70">
          <span>Hành trình đến Thế Giới Mới</span>
          <span>
            {world.destroyedCount}/{world.totalBuildings} tòa đã sụp
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/20">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300 transition-all duration-1000"
            style={{ width: `${(world.destroyedCount / Math.max(1, world.totalBuildings)) * 100}%` }}
          />
        </div>
      </div>

      {/* Thông báo của làng (tự ẩn sau vài giây) */}
      <VillageToasts />

      {/* Bản đồ khám phá */}
      <Minimap world={world} />

      {/* Lời tiên tri + gợi ý thao tác */}
      <div className="absolute bottom-3 left-1/2 hidden w-max max-w-[min(720px,60vw)] -translate-x-1/2 flex-col items-center gap-1.5 md:flex">
        <p
          className="rounded-lg bg-black/45 px-4 py-1.5 text-center font-serif text-[13px] italic leading-snug text-amber-100/90 backdrop-blur-sm"
          style={{ textShadow: "0 0 12px rgba(255,200,110,0.35)" }}
        >
          🔮 Còn <strong className="not-italic text-amber-300">{remaining}</strong> tòa nhà rác. Khi tòa cuối cùng sụp đổ, Thế
          Giới Mới sẽ mở ra cho lũ trẻ… và website này cũng sẽ biến mất mãi mãi.
        </p>
        <div className="rounded-lg bg-black/40 px-3 py-1.5 text-center text-[11px] text-white/50">
          🖱️ Trái: xoay · Phải: kéo khám phá · Lăn: zoom · Chạm tòa nhà để phá, em bé để nuôi, bảng gỗ giữa làng để xem vinh danh
        </div>
      </div>
    </div>
  );
}
