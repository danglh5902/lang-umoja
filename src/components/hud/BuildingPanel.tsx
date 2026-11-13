"use client";

import { useEffect, useState } from "react";
import type { BuildingData } from "@/lib/world-types";
import { useWorld } from "@/store/world";
import QrModal, { type PaymentPayload } from "./QrModal";
import { getDonorName, saveDonorName } from "@/lib/donorName";
import { destructionLevelFor, formatDestroy, formatKind, fromUnits, toUnits } from "@/lib/format";

const PRESETS = [10000, 20000, 50000, 100000];

export default function BuildingPanel({ building }: { building: BuildingData }) {
  const selectBuilding = useWorld((s) => s.selectBuilding);
  const [amount, setAmount] = useState<number>(20000);
  const [custom, setCustom] = useState("");
  const [payerName, setPayerName] = useState("");
  useEffect(() => setPayerName(getDonorName()), []);
  const [message, setMessage] = useState("");
  const [payment, setPayment] = useState<PaymentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const progress = Math.min(1, building.raisedAmount / building.goalAmount);
  const remaining = Math.max(0, building.goalAmount - building.raisedAmount);
  const power = destructionLevelFor(building.goalAmount);

  const donate = async () => {
    setLoading(true);
    setError(null);
    // ô tự nhập tính bằng nhân đạo → đổi ra đồng để thanh toán
    const finalAmount = custom ? fromUnits(Number(custom)) : amount;
    const res = await fetch("/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "DEMOLISH",
        buildingId: building.id,
        amount: finalAmount,
        payerName: payerName.trim() || getDonorName(),
        message: message || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
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
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-black leading-tight text-red-300">🏭 {building.name}</h2>
            <p className="mt-0.5 text-xs italic text-white/60">&ldquo;{building.slogan}&rdquo;</p>
          </div>
          <button className="text-white/50 hover:text-white" onClick={() => selectBuilding(null)}>
            ✕
          </button>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-white/80">{building.lore}</p>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-lg bg-red-950/60 p-2">
            <div className="text-base">💧</div>
            <div className="font-bold text-red-300">{building.crimes.waterPerDay.toLocaleString("vi-VN")} L</div>
            <div className="text-white/50">nước/ngày</div>
          </div>
          <div className="rounded-lg bg-red-950/60 p-2">
            <div className="text-base">⚡</div>
            <div className="font-bold text-red-300">{building.crimes.powerPerDay.toLocaleString("vi-VN")} kWh</div>
            <div className="text-white/50">điện/ngày</div>
          </div>
          <div className="rounded-lg bg-red-950/60 p-2">
            <div className="text-base">🌾</div>
            <div className="font-bold text-red-300">{building.crimes.landTaken.toLocaleString("vi-VN")} m²</div>
            <div className="text-white/50">đất chiếm</div>
          </div>
        </div>

        {building.source === "COMMUNITY" && (
          <p className="mt-2 rounded-lg bg-red-950/50 px-2 py-1 text-[11px] text-red-200/90">
            😈 Do kẻ xấu dựng: <strong>{building.contributorName ?? "Kẻ Giấu Mặt"}</strong> — hãy cho hắn thấy dân làng mạnh thế nào!
          </p>
        )}

        <div className="mt-3 flex items-center justify-between rounded-lg border border-red-500/30 bg-red-950/50 px-3 py-1.5 text-xs">
          <span className="font-bold text-red-200">
            {power.emoji} Mức {power.name}
          </span>
          <span className="font-bold text-red-300">💀 {formatDestroy(building.goalAmount)}</span>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/70">
            <span>Nhân đạo đã góp để phá</span>
            <span className="font-bold text-amber-300">{Math.round(progress * 100)}%</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-400 transition-all duration-700"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-white/50">
            Đã góp {formatKind(building.raisedAmount)} / sức hủy diệt {formatDestroy(building.goalAmount)}
            {remaining > 0 && ` — còn thiếu ${formatKind(remaining)}`}
          </p>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold text-white/70">⚒️ Góp nhân đạo để phá dỡ</p>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setAmount(p);
                  setCustom("");
                }}
                className={`rounded-lg px-1 py-1.5 text-xs font-bold ${
                  !custom && amount === p ? "bg-amber-400 text-black" : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {toUnits(p).toLocaleString("vi-VN")}
              </button>
            ))}
          </div>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
            placeholder="Hoặc nhập số nhân đạo khác"
            className="mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/35 focus:bg-white/15"
          />
          <label className="mt-2 block text-[11px] font-semibold text-amber-200/80">🏆 Tên của bạn trên Bảng Vinh Danh</label>
          <input
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            maxLength={50}
            placeholder="Tên hiện trên Bảng Vinh Danh"
            className="mt-1 w-full rounded-lg border border-amber-400/30 bg-white/10 px-3 py-2 text-sm font-semibold text-amber-100 outline-none placeholder:text-white/35 focus:bg-white/15"
          />
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Lời nhắn gửi lũ trẻ (tùy chọn)"
            className="mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/35 focus:bg-white/15"
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button
            disabled={loading}
            onClick={donate}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-2.5 font-black text-black hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Đang tạo mã QR..." : `⚒️ Góp ${formatKind(custom ? fromUnits(Number(custom)) : amount)} để phá`}
          </button>
          <a
            href={`/b/${building.slug}`}
            target="_blank"
            className="mt-2 block text-center text-[11px] text-sky-300/80 underline"
          >
            Xem poster + mã QR riêng của tòa này →
          </a>
        </div>
      </div>
      {payment && (
        <QrModal payload={payment} title={`Phá dỡ ${building.name}`} donorName={payerName.trim() || getDonorName()} onClose={() => setPayment(null)} />
      )}
    </>
  );
}
