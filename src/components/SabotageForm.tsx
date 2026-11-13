"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QrModal, { type PaymentPayload } from "./hud/QrModal";
import { useWorld } from "@/store/world";
import { destructionLevelFor, formatDestroy, formatKind, fromUnits, toUnits, type DestructionLevel } from "@/lib/format";
import { CUSTOM_PRICE_MAX, CUSTOM_PRICE_MIN } from "@/lib/buildings";

/** id giả cho lựa chọn "tự đặt sức hủy diệt" */
const CUSTOM = 0;

export default function SabotageForm({ levels }: { levels: DestructionLevel[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [villainName, setVillainName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [lore, setLore] = useState("");
  const [levelId, setLevelId] = useState<number>(levels[1].id);
  // levelId = CUSTOM → kẻ xấu tự nhập sức hủy diệt (đơn vị hủy diệt, tối thiểu CUSTOM_PRICE_MIN)
  const [customUnits, setCustomUnits] = useState("");
  const isCustom = levelId === CUSTOM;
  const customAmount = fromUnits(Number(customUnits) || 0);
  const customError =
    isCustom && customAmount < CUSTOM_PRICE_MIN
      ? `Tối thiểu ${toUnits(CUSTOM_PRICE_MIN).toLocaleString("vi-VN")} hủy diệt`
      : isCustom && customAmount > CUSTOM_PRICE_MAX
        ? `Tối đa ${toUnits(CUSTOM_PRICE_MAX).toLocaleString("vi-VN")} hủy diệt`
        : null;
  const level: DestructionLevel = isCustom
    ? { ...destructionLevelFor(customAmount, levels), id: CUSTOM, amount: customAmount }
    : (levels.find((l) => l.id === levelId) ?? levels[0]);
  const [payment, setPayment] = useState<PaymentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // vào trang kẻ xấu → đóng mọi bảng/lựa chọn còn sót lại trong làng
  useEffect(() => {
    useWorld.setState({
      openBoard: null,
      selectedBuildingId: null,
      selectedChildId: null,
      focusPoint: null,
      cinematic: null,
    });
  }, []);

  /** Về làng và bay camera tới đúng tòa nhà vừa dựng */
  const goSeeBuilding = async (orderCode: number) => {
    let buildingId: string | null = null;
    try {
      const res = await fetch(`/api/donations?orderCode=${orderCode}`, { cache: "no-store" });
      if (res.ok) buildingId = ((await res.json()) as { buildingId: string | null }).buildingId;
    } catch {}
    // đóng hộp QR khi chưa thanh toán → ở lại trang, chưa có tòa nào để xem
    if (!buildingId) return;
    const store = useWorld.getState();
    store.setOpenBoard(null);
    await store.fetchWorld();
    if (buildingId) store.selectBuilding(buildingId);
    router.push("/");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/sabotage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        villainName,
        slogan,
        lore,
        ...(isCustom ? { customAmount } : { level: levelId }),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Có lỗi xảy ra");
      return;
    }
    setPayment(data as PaymentPayload);
  };

  const inputCls =
    "w-full rounded-xl border border-red-900/50 bg-black/40 px-4 py-2.5 text-sm text-red-50 outline-none placeholder:text-red-200/30 focus:border-red-500/70";

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_top,#3a0b0e_0%,#120406_55%,#070203_100%)] px-4 py-10 text-white">
      <div className="film-grain" />
      <div className="relative mx-auto max-w-lg">
        <Link href="/" className="text-sm text-red-200/50 hover:text-red-100">
          ← Quay về làng (làm người tốt)
        </Link>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.35em] text-red-400/80">Hợp đồng bóng tối</p>
        <h1 className="mt-2 font-serif text-4xl font-black text-red-300 md:text-5xl">😈 Phá hủy làng Umoja</h1>
        <p className="mt-3 font-serif text-lg italic leading-relaxed text-red-100/80">
          Ngươi muốn làm kẻ xấu? Chọn sức hủy diệt, đặt tên — và một tòa nhà rác sẽ trồi lên giữa làng ngay trong đêm nay.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          {/* BƯỚC 1 — sức hủy diệt */}
          <div className="flex items-baseline gap-2">
            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-black text-white">1</span>
            <h2 className="font-serif text-2xl font-black text-red-200">Chọn sức hủy diệt</h2>
          </div>
          <p className="-mt-1 text-xs text-red-100/55">
            Sức hủy diệt càng lớn, tòa nhà càng to — dân làng phải góp đủ bấy nhiêu <strong>nhân đạo</strong> mới hạ được nó.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {levels.map((l) => {
              const active = l.id === levelId;
              return (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => setLevelId(l.id)}
                  aria-pressed={active}
                  className={`relative rounded-2xl border-2 p-3.5 text-left transition ${
                    active
                      ? "scale-[1.02] border-red-400 bg-red-600/30 shadow-[0_0_28px_rgba(255,60,60,0.45)]"
                      : "border-red-900/50 bg-black/35 hover:border-red-600/70"
                  }`}
                >
                  {active && (
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                      ĐÃ CHỌN
                    </span>
                  )}
                  <div className="text-3xl">{l.emoji}</div>
                  <div className="mt-1 font-serif text-xl font-black text-red-100">{l.name}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-red-300">{toUnits(l.amount).toLocaleString("vi-VN")}</span>
                    <span className="text-xs font-semibold text-red-300/80">sức hủy diệt</span>
                  </div>
                  <div className="mt-1.5 text-[11px] leading-snug text-red-100/55">{l.desc}</div>
                </button>
              );
            })}
            {/* tự đặt sức hủy diệt */}
            <div
              onClick={() => setLevelId(CUSTOM)}
              className={`relative col-span-2 cursor-pointer rounded-2xl border-2 p-3.5 text-left transition ${
                isCustom
                  ? "border-red-400 bg-red-600/30 shadow-[0_0_28px_rgba(255,60,60,0.45)]"
                  : "border-red-900/50 bg-black/35 hover:border-red-600/70"
              }`}
            >
              {isCustom && (
                <span className="absolute right-2.5 top-2.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                  ĐÃ CHỌN
                </span>
              )}
              <div className="font-serif text-xl font-black text-red-100">🎯 Tự đặt sức hủy diệt</div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  inputMode="numeric"
                  value={customUnits}
                  onFocus={() => setLevelId(CUSTOM)}
                  onChange={(e) => {
                    setLevelId(CUSTOM);
                    setCustomUnits(e.target.value.replace(/\D/g, ""));
                  }}
                  placeholder={`Từ ${toUnits(CUSTOM_PRICE_MIN).toLocaleString("vi-VN")}`}
                  className="w-40 rounded-xl border border-red-900/50 bg-black/40 px-3 py-2 text-lg font-black text-red-200 outline-none placeholder:text-red-200/30 focus:border-red-500/70"
                />
                <span className="text-xs font-semibold text-red-300/80">sức hủy diệt</span>
              </div>
              <div className="mt-1.5 text-[11px] leading-snug text-red-100/55">
                {isCustom && customError
                  ? customError
                  : isCustom && customAmount > 0
                    ? `Xếp vào mức ${level.emoji} ${level.name}.`
                    : `Tối thiểu ${toUnits(CUSTOM_PRICE_MIN).toLocaleString("vi-VN")} hủy diệt. Muốn bao nhiêu tùy ngươi.`}
              </div>
            </div>
          </div>

          {/* BƯỚC 2 — đặt tên */}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-black text-white">2</span>
            <h2 className="font-serif text-2xl font-black text-red-200">Đặt tên tòa nhà</h2>
          </div>
          <label className="text-xs font-semibold text-red-200/70">
            Tên tòa nhà rác *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              maxLength={40}
              placeholder="vd: Lò Ấp Meme Tự Động"
              className={`${inputCls} mt-1 text-base font-bold`}
            />
          </label>
          <label className="text-xs font-semibold text-red-200/70">
            Danh xưng kẻ xấu (hiện trên biển hiệu)
            <input
              value={villainName}
              onChange={(e) => setVillainName(e.target.value)}
              maxLength={40}
              placeholder="Để trống = Kẻ Giấu Mặt"
              className={`${inputCls} mt-1`}
            />
          </label>
          <label className="text-xs font-semibold text-red-200/70">
            Khẩu hiệu (tùy chọn)
            <input
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              maxLength={100}
              placeholder="vd: Mỗi giây một meme, mỗi meme một lít nước"
              className={`${inputCls} mt-1`}
            />
          </label>
          <label className="text-xs font-semibold text-red-200/70">
            Nó làm gì? (tùy chọn — để trống, làng sẽ tự kể)
            <textarea
              value={lore}
              onChange={(e) => setLore(e.target.value)}
              maxLength={500}
              rows={3}
              className={`${inputCls} mt-1`}
            />
          </label>

          {/* xem trước biển hiệu */}
          <div className="mt-1 rounded-xl border-4 border-red-500/80 bg-gradient-to-b from-[#2b0d10] to-[#160507] px-4 py-3 text-center shadow-[0_0_30px_rgba(255,60,60,0.25)]">
            <p className="text-[10px] uppercase tracking-widest text-red-300/60">Biển hiệu trước cổng</p>
            <p className="mt-1 truncate text-2xl font-extrabold text-[#fff4e6] drop-shadow-[0_0_10px_rgba(255,60,60,0.8)]">
              {name || "Tên tòa nhà của ngươi"}
            </p>
            <p className="text-sm text-red-300/80">Kẻ dựng: {villainName || "Kẻ Giấu Mặt"}</p>
            <p className="mt-1 text-xs font-bold text-red-400">
              {level.emoji} {level.name} · {formatDestroy(level.amount)}
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || customError !== null || (isCustom && customAmount === 0)}
            className="mt-1 rounded-2xl bg-gradient-to-r from-red-600 to-red-800 py-3 font-black tracking-wide text-white shadow-[0_0_24px_rgba(220,30,30,0.45)] hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Đang ký hợp đồng..." : `🩸 Tung ${formatDestroy(level.amount)} & dựng tòa nhà`}
          </button>
        </form>

        <ul className="mt-8 space-y-1.5 text-sm text-red-100/65">
          <li>🏭 Tên tòa nhà được khắc lên <strong>biển hiệu trước cổng</strong>, ai đi qua cũng thấy.</li>
          <li>💀 Nó đứng trên <strong>Bảng Kẻ Xấu</strong> giữa làng, đếm từng giờ nó còn tồn tại.</li>
          <li>⏳ Mỗi tòa mới đẩy ngày &ldquo;Thế Giới Mới&rdquo; ra xa hơn — cho tới khi cộng đồng phá nó.</li>
          <li className="text-red-200/50">
            (Bí mật nhỏ: sức hủy diệt ngươi tung ra rồi cũng được làng biến thành bánh mì cho lũ trẻ — kẻ xấu đôi khi
            cũng làm điều tốt mà không biết.)
          </li>
        </ul>
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-100/90">
          ⚠️ Đây là thế giới châm biếm hư cấu. KHÔNG đặt tên theo người, công ty hay dự án có thật — hội đồng làng sẽ
          gỡ bỏ tòa nhà đó.
        </p>
      </div>
      {payment && (
        <QrModal
          payload={payment}
          title={`${level.emoji} Tung ${formatDestroy(level.amount)}`}
          unit="destroy"
          paidEmoji="🏭"
          paidTitle={`"${name}" đã trồi lên giữa làng!`}
          paidText={`Mặt đất rung chuyển. Biển hiệu của ngươi đã sáng đèn với sức hủy diệt ${formatDestroy(level.amount)}. Giờ thì xem dân làng có gom đủ ${formatKind(level.amount)} để hạ nó không...`}
          paidAction="😈 Vào làng xem tòa nhà"
          onClose={() => {
            const code = payment.orderCode;
            setPayment(null);
            void goSeeBuilding(code);
          }}
        />
      )}
    </main>
  );
}
