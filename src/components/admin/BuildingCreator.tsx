"use client";

import { useState } from "react";
import { fromUnits, toUnits } from "@/lib/format";
import { CUSTOM_PRICE_MAX, CUSTOM_PRICE_MIN } from "@/lib/buildings";

/** Admin thêm tòa nhà rác với giá tự đặt, hoặc nạp các tòa mẫu của làng. */
export default function BuildingCreator({
  password,
  buildingCount,
  onDone,
}: {
  password: string;
  buildingCount: number;
  onDone: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");
  const [slogan, setSlogan] = useState("");
  const [lore, setLore] = useState("");
  const [villain, setVillain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const amount = fromUnits(Number(units) || 0);
  const amountError =
    units && (amount < CUSTOM_PRICE_MIN || amount > CUSTOM_PRICE_MAX)
      ? `Từ ${toUnits(CUSTOM_PRICE_MIN).toLocaleString("vi-VN")} đến ${toUnits(CUSTOM_PRICE_MAX).toLocaleString("vi-VN")} hủy diệt`
      : null;

  const post = async (body: object) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/buildings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    return { ok: res.ok, data };
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await post({ name, goalAmount: amount, slogan, lore, contributorName: villain });
    if (!ok) return setMsg({ ok: false, text: data?.error ?? "Không thêm được" });
    setMsg({ ok: true, text: `Đã dựng "${name}" giữa làng.` });
    setName("");
    setUnits("");
    setSlogan("");
    setLore("");
    setVillain("");
    await onDone();
  };

  const loadSamples = async () => {
    if (!confirm("Nạp các tòa mẫu của làng (12 tòa) còn thiếu? Tòa đang có không bị ảnh hưởng.")) return;
    const { ok, data } = await post({ sample: true });
    if (!ok) return setMsg({ ok: false, text: data?.error ?? "Không nạp được" });
    setMsg({ ok: true, text: data.added ? `Đã nạp ${data.added} tòa mẫu.` : "Đã đủ tòa mẫu, không thêm gì." });
    await onDone();
  };

  const cls = "w-full rounded-lg bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/30";

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-amber-300">🏗️ Thêm tòa nhà</h2>
        <button
          type="button"
          disabled={busy}
          onClick={loadSamples}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
            buildingCount === 0 ? "bg-amber-400 text-black" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          📦 Nạp 12 tòa mẫu
        </button>
      </div>
      {buildingCount === 0 && (
        <p className="mt-1 text-xs text-amber-200">Làng đang chưa có tòa nào — bấm “Nạp 12 tòa mẫu” để bắt đầu nhanh.</p>
      )}

      <form onSubmit={create} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={40} placeholder="Tên tòa nhà *" className={cls} />
        <div>
          <div className="flex items-center gap-2">
            <input
              inputMode="numeric"
              value={units}
              onChange={(e) => setUnits(e.target.value.replace(/\D/g, ""))}
              required
              placeholder={`Sức hủy diệt * (từ ${toUnits(CUSTOM_PRICE_MIN).toLocaleString("vi-VN")})`}
              className={cls}
            />
            <span className="shrink-0 text-[11px] text-white/40">= {amount.toLocaleString("vi-VN")}đ</span>
          </div>
          {amountError && <p className="mt-0.5 text-[11px] text-red-400">{amountError}</p>}
        </div>
        <input value={slogan} onChange={(e) => setSlogan(e.target.value)} maxLength={100} placeholder="Khẩu hiệu (tùy chọn)" className={cls} />
        <input value={villain} onChange={(e) => setVillain(e.target.value)} maxLength={40} placeholder="Kẻ dựng (tùy chọn — có tên thì hiện như tòa kẻ xấu)" className={cls} />
        <textarea value={lore} onChange={(e) => setLore(e.target.value)} maxLength={500} rows={2} placeholder="Câu chuyện (tùy chọn — để trống làng tự kể)" className={`${cls} sm:col-span-2`} />
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            disabled={busy || !!amountError || amount === 0 || name.trim().length < 3}
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
          >
            {busy ? "Đang dựng..." : "🏭 Dựng tòa (không thu tiền)"}
          </button>
          {msg && <p className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-400"}`}>{msg.text}</p>}
        </div>
      </form>
      <p className="mt-2 text-[11px] text-white/40">
        Sức hủy diệt = số nhân đạo dân làng phải góp để phá tòa. Nhớ: không dùng tên dự án/công ty/người có thật.
      </p>
    </section>
  );
}
