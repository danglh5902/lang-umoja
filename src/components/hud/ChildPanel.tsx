"use client";

import { useEffect, useRef, useState } from "react";
import type { ChildData, ItemData } from "@/lib/world-types";
import { useWorld } from "@/store/world";
import QrModal, { type PaymentPayload } from "./QrModal";
import { getDonorName, saveDonorName } from "@/lib/donorName";
import { formatKind } from "@/lib/format";
import { CARE_ACTIONS, CARE_COOLDOWN_MS, NEED_BELOW, primaryStat, type CareKind } from "@/lib/care";

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  // hiện +N trong 2.5 giây khi chỉ số tăng (sau khi tặng quà / giúp miễn phí)
  const prev = useRef(value);
  const [delta, setDelta] = useState(0);
  useEffect(() => {
    const d = value - prev.current;
    prev.current = value;
    if (d <= 0) return;
    setDelta(d);
    const t = setTimeout(() => setDelta(0), 2500);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/70">
        <span>{label}</span>
        <span className="font-bold">
          {delta > 0 && <span className="mr-1 text-emerald-300">+{delta}</span>}
          {value}/100
        </span>
      </div>
      <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function ChildPanel({ child, items }: { child: ChildData; items: ItemData[] }) {
  const selectChild = useWorld((s) => s.selectChild);
  const [payerName, setPayerName] = useState("");
  useEffect(() => setPayerName(getDonorName()), []);
  const [payment, setPayment] = useState<PaymentPayload | null>(null);
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [caring, setCaring] = useState<CareKind | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [careMsg, setCareMsg] = useState<string | null>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  // đổi sang em khác thì xóa trạng thái cũ
  useEffect(() => {
    setCooldown(0);
    setCareMsg(null);
  }, [child.id]);

  const care = async (kind: CareKind) => {
    setCaring(kind);
    setCareMsg(null);
    setError(null);
    const res = await fetch("/api/care", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: child.id, kind, name: payerName.trim() || getDonorName() }),
    });
    const data = await res.json().catch(() => ({}));
    setCaring(null);
    if (res.ok) {
      setCooldown(Math.ceil((data.cooldownMs ?? CARE_COOLDOWN_MS) / 1000));
      setCareMsg(`${CARE_ACTIONS[kind].emoji} Cảm ơn bạn! ${child.name} vui lắm.`);
    } else {
      if (data.retryAfterMs) setCooldown(Math.ceil(data.retryAfterMs / 1000));
      else setError(data.error ?? "Có lỗi xảy ra");
    }
  };

  const stageLabel = ["", "Nhỏ xíu", "Đang lớn", "Khôn lớn"][child.growthStage] ?? "";

  const feed = async (item: ItemData) => {
    setPendingItem(item.slug);
    setError(null);
    const res = await fetch("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "FEED",
        childId: child.id,
        itemSlug: item.slug,
        payerName: payerName.trim() || getDonorName(),
      }),
    });
    const data = await res.json();
    setPendingItem(null);
    if (!res.ok) {
      setError(data.error ?? "Có lỗi xảy ra");
      return;
    }
    saveDonorName(payerName);
    setPayment(data as PaymentPayload);
  };

  return (
    <>
      <div className="pointer-events-auto fixed right-3 top-16 z-30 w-[340px] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-140px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#141b17]/95 p-5 text-white shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-emerald-300">🧒 {child.name}</h2>
            <p className="text-[11px] text-white/50">
              Giai đoạn: {stageLabel} · đã nhận {formatKind(child.totalFedAmount)}
            </p>
          </div>
          <button className="text-white/50 hover:text-white" onClick={() => selectChild(null)}>
            ✕
          </button>
        </div>

        <p className="mt-2 text-[13px] italic leading-relaxed text-white/75">{child.backstory}</p>

        <div className="mt-3 flex flex-col gap-2">
          <Stat label="🍞 No bụng" value={child.hunger} color="#f4a261" />
          <Stat label="💧 Đủ nước" value={child.thirst} color="#4cc9f0" />
          <Stat label="😊 Niềm vui" value={child.joy} color="#80ed99" />
        </div>

        <p className="mb-1.5 mt-4 text-xs font-semibold text-emerald-200">
          🌱 Giúp em miễn phí <span className="font-normal text-white/50">— không cần góp tiền</span>
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(CARE_ACTIONS) as CareKind[]).map((kind) => {
            const a = CARE_ACTIONS[kind];
            return (
              <button
                key={kind}
                disabled={caring !== null || cooldown > 0}
                onClick={() => care(kind)}
                className="rounded-xl bg-emerald-500/15 px-1 py-2 text-center text-[11px] leading-tight hover:bg-emerald-400/30 disabled:opacity-50"
              >
                <div className="text-xl">{a.emoji}</div>
                {a.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[10px] text-white/45">
          {cooldown > 0 ? `Em đang nghỉ, thử lại sau ${cooldown}s` : "Mỗi lần giúp nhỏ thôi, nhưng ai cũng làm được."}
        </p>
        {careMsg && <p className="mt-1 text-xs text-emerald-300">{careMsg}</p>}

        <label className="mt-3 block text-[11px] font-semibold text-amber-200/80">🏆 Tên của bạn trên Bảng Vinh Danh</label>
        <input
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
          maxLength={50}
          placeholder="Tên hiện trên Bảng Vinh Danh"
          className="mt-1 w-full rounded-lg border border-amber-400/30 bg-white/10 px-3 py-2 text-sm font-semibold text-amber-100 outline-none placeholder:text-white/35 focus:bg-white/15"
        />
        <p className="mb-1.5 mt-4 text-xs font-semibold text-white/70">🎁 Gửi quà cho {child.name}</p>
        <div className="grid grid-cols-1 gap-1.5">
          {items.map((item) => {
            const full =
              child[
                primaryStat({ hunger: item.hungerEffect, thirst: item.thirstEffect, joy: item.joyEffect })
              ] >= NEED_BELOW;
            return (
            <button
              key={item.slug}
              disabled={pendingItem !== null || full}
              title={full ? `${child.name} chưa cần món này` : undefined}
              onClick={() => feed(item)}
              className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-left text-sm hover:bg-emerald-400/20 disabled:opacity-50"
            >
              <span>
                {item.emoji} {item.name}
                <span className="ml-2 text-[10px] text-white/50">
                  {item.hungerEffect > 0 && `+${item.hungerEffect}🍞 `}
                  {item.thirstEffect > 0 && `+${item.thirstEffect}💧 `}
                  {item.joyEffect > 0 && `+${item.joyEffect}😊`}
                </span>
              </span>
              <span className="font-bold text-amber-300">
                {pendingItem === item.slug ? "..." : full ? "Em đã đủ" : formatKind(item.price)}
              </span>
            </button>
            );
          })}
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
      {payment && (
        <QrModal payload={payment} title={`Gửi quà cho ${child.name}`} donorName={payerName.trim() || getDonorName()} onClose={() => setPayment(null)} />
      )}
    </>
  );
}
