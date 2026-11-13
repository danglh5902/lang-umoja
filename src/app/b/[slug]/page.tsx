import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { destructionLevelFor, formatDestroy, formatKind } from "@/lib/format";
import { getDestructionLevels } from "@/lib/prices";

export const dynamic = "force-dynamic";

/** Trang poster riêng của mỗi tòa nhà — có mã QR tĩnh để chia sẻ/in. */
export default async function BuildingPoster({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const building = await prisma.building.findUnique({ where: { slug } });
  if (!building) notFound();

  const crimes = JSON.parse(building.crimes) as {
    waterPerDay: number;
    powerPerDay: number;
    landTaken: number;
  };
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  const url = `${site}/b/${building.slug}`;
  const qr = await QRCode.toDataURL(url, { width: 300, margin: 1 });
  const progress = Math.min(100, Math.round((building.raisedAmount / building.goalAmount) * 100));
  const destroyed = building.status === "DESTROYED";
  const level = destructionLevelFor(building.goalAmount, await getDestructionLevels());

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#131a16] p-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1b241f] p-8 shadow-2xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
          {destroyed ? "Hồ sơ lưu trữ" : "Lệnh truy nã dự án rác AI"}
        </p>
        <h1 className="mt-2 text-center text-3xl font-black text-red-300">
          {destroyed ? "🌳" : "🏭"} {building.name}
        </h1>
        <p className="mt-1 text-center text-sm italic text-white/60">&ldquo;{building.slogan}&rdquo;</p>

        <p className="mt-4 text-sm leading-relaxed text-white/80">{building.lore}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-lg bg-red-950/50 p-2">
            <div className="font-bold text-red-300">💧 {crimes.waterPerDay.toLocaleString("vi-VN")} L</div>
            <div className="text-white/50">nước/ngày</div>
          </div>
          <div className="rounded-lg bg-red-950/50 p-2">
            <div className="font-bold text-red-300">⚡ {crimes.powerPerDay.toLocaleString("vi-VN")} kWh</div>
            <div className="text-white/50">điện/ngày</div>
          </div>
          <div className="rounded-lg bg-red-950/50 p-2">
            <div className="font-bold text-red-300">🌾 {crimes.landTaken.toLocaleString("vi-VN")} m²</div>
            <div className="text-white/50">đất chiếm</div>
          </div>
        </div>

        {destroyed ? (
          <div className="mt-6 rounded-2xl bg-emerald-500/15 p-4 text-center">
            <p className="text-lg font-black text-emerald-300">ĐÃ SỤP ĐỔ 💥</p>
            <p className="mt-1 text-sm text-white/70">
              Nhờ {formatKind(building.raisedAmount)} từ cộng đồng, nơi này giờ là một
              tán cây xanh.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <div className="flex justify-between text-xs text-white/70">
                <span>
                  {level.emoji} Mức {level.name} — nhân đạo đã góp
                </span>
                <span className="font-bold text-amber-300">{progress}%</span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-white/50">
                Đã góp {formatKind(building.raisedAmount)} / sức hủy diệt{" "}
                {formatDestroy(building.goalAmount)}
              </p>
            </div>
            <div className="mt-5 flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR của ${building.name}`} className="h-48 w-48 rounded-xl bg-white p-2" />
              <p className="text-center text-[11px] text-white/50">
                Quét QR này để mở trang của tòa nhà — chia sẻ hoặc in thành poster kêu gọi phá dỡ.
              </p>
            </div>
          </>
        )}

        <Link
          href="/"
          className="mt-6 block rounded-2xl bg-emerald-500 py-3 text-center font-black text-black hover:bg-emerald-400"
        >
          {destroyed ? "🌍 Về làng Umoja" : "⚒️ Vào làng góp búa phá dỡ"}
        </Link>
      </div>
    </main>
  );
}
