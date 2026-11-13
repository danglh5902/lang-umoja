"use client";

import { useState } from "react";
import { fromUnits, toUnits, type DestructionLevel } from "@/lib/format";

export interface AdminItem {
  slug: string;
  name: string;
  emoji: string;
  price: number;
}

/**
 * Sửa giá quà tặng và giá các mức hủy diệt. Admin nhập theo đơn vị hiển thị
 * (nhân đạo / hủy diệt); gửi lên server bằng đồng.
 */
export default function PriceEditor({
  items,
  levels,
  password,
  onSaved,
}: {
  items: AdminItem[];
  levels: DestructionLevel[];
  password: string;
  onSaved: () => Promise<void>;
}) {
  // giá trị đang gõ, tính bằng đơn vị (1 đơn vị = 100đ)
  const [itemDraft, setItemDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.slug, String(toUnits(i.price))]))
  );
  const [levelDraft, setLevelDraft] = useState<Record<number, string>>(() =>
    Object.fromEntries(levels.map((l) => [l.id, String(toUnits(l.amount))]))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const changedItems = items
    .filter((i) => fromUnits(Number(itemDraft[i.slug])) !== i.price)
    .map((i) => ({ slug: i.slug, price: fromUnits(Number(itemDraft[i.slug])) }));
  const changedLevels = levels
    .filter((l) => fromUnits(Number(levelDraft[l.id])) !== l.amount)
    .map((l) => ({ id: l.id, amount: fromUnits(Number(levelDraft[l.id])) }));
  const dirty = changedItems.length + changedLevels.length > 0;

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ items: changedItems, levels: changedLevels }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data?.error ?? "Không lưu được" });
      return;
    }
    setMsg({ ok: true, text: "Đã lưu giá mới. Áp dụng cho các đơn tạo từ bây giờ." });
    await onSaved();
  };

  const input = (value: string, onChange: (v: string) => void, changed: boolean) => (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      className={`w-28 rounded-lg px-2 py-1 text-right text-sm font-bold outline-none ${
        changed ? "bg-amber-400/25 text-amber-100" : "bg-white/10"
      }`}
    />
  );

  const vnd = (units: string) => `= ${fromUnits(Number(units) || 0).toLocaleString("vi-VN")}đ`;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="font-bold text-emerald-300">💰 Bảng giá</h2>
      <p className="mt-1 text-xs text-white/50">
        Nhập theo đơn vị trên site (1 nhân đạo = 1 hủy diệt = 100đ). Giá mới chỉ áp dụng cho đơn tạo sau khi lưu —
        đơn đang chờ thanh toán và tòa đã dựng giữ nguyên giá cũ.
      </p>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-white/80">🎁 Quà tặng em bé (nhân đạo)</h3>
          <div className="mt-2 flex flex-col gap-1.5">
            {items.map((i) => (
              <label key={i.slug} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {i.emoji} {i.name}
                </span>
                <span className="flex items-center gap-2">
                  {input(
                    itemDraft[i.slug] ?? "",
                    (v) => setItemDraft((d) => ({ ...d, [i.slug]: v })),
                    changedItems.some((c) => c.slug === i.slug)
                  )}
                  <span className="w-24 text-[11px] text-white/40">{vnd(itemDraft[i.slug] ?? "")}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white/80">😈 Mức dựng tòa nhà (hủy diệt)</h3>
          <div className="mt-2 flex flex-col gap-1.5">
            {levels.map((l) => (
              <label key={l.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {l.emoji} {l.name}
                </span>
                <span className="flex items-center gap-2">
                  {input(
                    levelDraft[l.id] ?? "",
                    (v) => setLevelDraft((d) => ({ ...d, [l.id]: v })),
                    changedLevels.some((c) => c.id === l.id)
                  )}
                  <span className="w-24 text-[11px] text-white/40">{vnd(levelDraft[l.id] ?? "")}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-white/40">Mức sau phải cao hơn mức trước.</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          disabled={!dirty || saving}
          onClick={save}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
        >
          {saving ? "Đang lưu..." : "💾 Lưu bảng giá"}
        </button>
        {msg && <p className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-400"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
