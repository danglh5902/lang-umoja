"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WorldData } from "@/lib/world-types";
import { useWorld } from "@/store/world";
import { formatDestroy, formatDuration, formatKind } from "@/lib/format";

interface HonorDetail {
  name: string;
  total: number;
  entries: { id: string; amount: number; at: string; text: string; message: string | null }[];
}

function HonorBoard({ world }: { world: WorldData }) {
  const [detail, setDetail] = useState<HonorDetail | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const open = async (name: string) => {
    setLoading(name);
    const res = await fetch(`/api/honor?name=${encodeURIComponent(name)}`, { cache: "no-store" });
    setLoading(null);
    if (res.ok) setDetail((await res.json()) as HonorDetail);
  };

  if (detail) {
    return (
      <div>
        <button onClick={() => setDetail(null)} className="text-xs text-amber-200/70 hover:text-amber-100">
          ← Bảng vinh danh
        </button>
        <h3 className="mt-2 font-serif text-2xl font-black text-amber-200">{detail.name}</h3>
        <p className="text-sm text-white/60">
          Đã gieo <strong className="text-amber-300">{formatKind(detail.total)}</strong> cho làng qua{" "}
          {detail.entries.length} lần ủng hộ
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          {detail.entries.map((e) => (
            <div key={e.id} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
              <div className="flex justify-between gap-3">
                <span>{e.text}</span>
                <span className="shrink-0 font-bold text-amber-300">{formatKind(e.amount)}</span>
              </div>
              <div className="text-[11px] text-white/40">{new Date(e.at).toLocaleString("vi-VN")}</div>
              {e.message && <div className="mt-1 text-xs italic text-emerald-200/80">&ldquo;{e.message}&rdquo;</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-serif text-2xl font-black text-amber-200">🏆 Bảng Vinh Danh</h3>
      <p className="text-xs text-white/55">
        Những Người Gieo Mầm đã góp tiền phá dỡ và nuôi trẻ. Chạm vào tên để xem họ đã ủng hộ gì.
      </p>
      {world.honor.length === 0 && (
        <p className="mt-4 text-sm italic text-white/50">Chưa có ai ghi danh. Hãy nhập tên khi ủng hộ để trở thành người đầu tiên!</p>
      )}
      <div className="mt-3 flex flex-col gap-1">
        {world.honor.map((h, i) => (
          <button
            key={h.name}
            onClick={() => open(h.name)}
            className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-amber-400/15"
          >
            <span
              className={`w-7 text-center font-black ${
                i === 0 ? "text-yellow-300" : i === 1 ? "text-gray-200" : i === 2 ? "text-orange-300" : "text-white/50"
              }`}
            >
              {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
            </span>
            <span className="flex-1 truncate font-semibold">{h.name}</span>
            <span className="text-[11px] text-white/40">{h.count} lần</span>
            <span className="font-bold text-amber-300">{loading === h.name ? "..." : formatKind(h.total)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function VillainBoard({ world }: { world: WorldData }) {
  const selectBuilding = useWorld((s) => s.selectBuilding);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const standing = world.buildings
    .filter((b) => b.status === "STANDING")
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const fallen = world.buildings
    .filter((b) => b.status === "DESTROYED")
    .sort((a, b) => +new Date(b.destroyedAt ?? 0) - +new Date(a.destroyedAt ?? 0));

  const live = (ms: number) => {
    const s = Math.floor(ms / 1000) % 60;
    return `${formatDuration(ms)} ${String(s).padStart(2, "0")}s`;
  };

  return (
    <div>
      <h3 className="font-serif text-2xl font-black text-red-300">💀 Bảng Kẻ Xấu</h3>
      <p className="text-xs text-white/55">
        Các tòa nhà rác và thời gian chúng đã đứng trên đất làng. Chạm để bay tới và góp búa phá.
      </p>
      <div className="mt-3 flex flex-col gap-1">
        {standing.map((b) => (
          <button
            key={b.id}
            onClick={() => selectBuilding(b.id)}
            className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-left text-sm hover:bg-red-900/40"
          >
            <div className="font-bold">
              {b.source === "COMMUNITY" ? "😈" : "🏭"} {b.name}
            </div>
            <div className="mt-0.5 font-mono text-xs text-red-200">⏳ đã tồn tại {live(now - +new Date(b.createdAt))}</div>
            <div className="text-[11px] text-white/45">
              {b.source === "COMMUNITY" ? `Kẻ dựng: ${b.contributorName ?? "Kẻ Giấu Mặt"} · ` : ""}
              💀 {formatDestroy(b.goalAmount)} · đã góp {Math.min(100, Math.round((b.raisedAmount / b.goalAmount) * 100))}% nhân đạo
            </div>
          </button>
        ))}
        {standing.length === 0 && <p className="text-sm text-emerald-300">Không còn kẻ xấu nào đứng vững. 🌳</p>}
      </div>
      {fallen.length > 0 && (
        <>
          <p className="mb-1 mt-4 text-xs font-bold text-emerald-300/80">🌳 Đã sụp đổ</p>
          <div className="flex flex-col gap-1">
            {fallen.map((b) => (
              <div key={b.id} className="flex justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50">
                <span className="truncate line-through">{b.name}</span>
                <span className="shrink-0">
                  tồn tại {formatDuration(+new Date(b.destroyedAt ?? now) - +new Date(b.createdAt))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <Link
        href="/sabotage"
        className="mt-4 block rounded-xl border border-red-700/50 py-2 text-center text-xs font-bold text-red-300 hover:bg-red-900/30"
      >
        😈 Muốn ghi tên mình lên bảng này? Phá hủy làng →
      </Link>
    </div>
  );
}

export default function BoardPanel({ world }: { world: WorldData }) {
  const openBoard = useWorld((s) => s.openBoard);
  const setOpenBoard = useWorld((s) => s.setOpenBoard);
  if (!openBoard) return null;
  return (
    <div className="pointer-events-auto fixed right-3 top-16 z-30 max-h-[calc(100dvh-140px)] w-[360px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#17120d]/95 p-5 text-white shadow-2xl backdrop-blur">
      <button className="float-right text-white/50 hover:text-white" onClick={() => setOpenBoard(null)}>
        ✕
      </button>
      {openBoard === "honor" ? <HonorBoard world={world} /> : <VillainBoard world={world} />}
    </div>
  );
}
