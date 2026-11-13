"use client";

import { useEffect, useState } from "react";
import type { ChildData, ItemData } from "@/lib/world-types";
import { useWorld } from "@/store/world";
import QrModal, { type PaymentPayload } from "./QrModal";
import { getDonorName, saveDonorName } from "@/lib/donorName";
import { formatKind } from "@/lib/format";

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/70">
        <span>{label}</span>
        <span className="font-bold">{value}/100</span>
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
          {items.map((item) => (
            <button
              key={item.slug}
              disabled={pendingItem !== null}
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
                {pendingItem === item.slug ? "..." : formatKind(item.price)}
              </span>
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
      {payment && (
        <QrModal payload={payment} title={`Gửi quà cho ${child.name}`} donorName={payerName.trim() || getDonorName()} onClose={() => setPayment(null)} />
      )}
    </>
  );
}
