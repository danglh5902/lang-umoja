import Link from "next/link";
import { prisma } from "@/lib/db";
import { getWorld } from "@/lib/game";
import { toUnits } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Trang kết — nơi website "ngủ yên" sau khi tòa nhà rác cuối cùng sụp đổ. */
export default async function EpiloguePage() {
  const world = await getWorld();

  // Thế giới mới chưa mở → nhắc người xem quay lại làng
  if (!world.sunsetAt) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#131a16] p-6 text-center text-white">
        <div className="text-6xl">🔮</div>
        <h1 className="mt-4 text-2xl font-black">Thế giới mới chưa mở</h1>
        <p className="mt-2 max-w-md text-sm text-white/70">
          Lời tiên tri chỉ ứng nghiệm khi tòa nhà rác cuối cùng sụp đổ. Hiện còn{" "}
          <strong className="text-red-300">
            {world.totalBuildings - world.destroyedCount}/{world.totalBuildings}
          </strong>{" "}
          tòa đang đứng.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-2xl bg-emerald-500 px-8 py-3 font-black text-black hover:bg-emerald-400"
        >
          ⚒️ Quay lại làng góp búa
        </Link>
      </main>
    );
  }

  const [destroyedBuildings, donors] = await Promise.all([
    prisma.building.findMany({
      where: { status: "DESTROYED" },
      orderBy: { destroyedAt: "asc" },
    }),
    prisma.donation.findMany({
      where: { status: "PAID", payerName: { not: null } },
      select: { payerName: true },
      distinct: ["payerName"],
      take: 200,
    }),
  ]);

  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#0e2a1a] via-[#133a22] to-[#0a1f12] px-4 py-16 text-white">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-7xl">🌍</div>
        <h1 className="mt-4 text-4xl font-black text-emerald-200">Thế Giới Mới đã mở</h1>
        <p className="mt-3 text-sm text-emerald-100/70">
          {new Date(world.sunsetAt).toLocaleDateString("vi-VN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          — ngày tòa nhà rác cuối cùng sụp đổ ở làng Umoja.
        </p>

        <div className="mx-auto mt-10 max-w-lg space-y-4 text-left text-base leading-relaxed text-white/85">
          <p>
            Không còn tiếng server rì rầm. Không còn khói. Suối đã chảy lại quanh chân đồi, và trên
            nền móng của {world.totalBuildings} dự án rác AI, giờ là {world.totalBuildings} tán cây.
          </p>
          <p>
            Lũ trẻ không còn xếp hàng lấy nước. Amani lại ra suối câu cá. Zuri vẽ làng bằng màu xanh
            thật. Và Ayo — nụ cười của em giờ có cả một thế giới để lớn lên cùng.
          </p>
          <p className="font-semibold text-emerald-200">
            Website này được sinh ra để tự kết thúc. Hôm nay, nó đã hoàn thành sứ mệnh — và ngủ yên
            cùng những tòa nhà rác.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-2xl font-black text-emerald-300">{world.totalBuildings}</div>
            <div className="mt-1 text-xs text-white/60">tòa rác đã phá</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-2xl font-black text-amber-300">
              {toUnits(world.totalRaised).toLocaleString("vi-VN")}
            </div>
            <div className="mt-1 text-xs text-white/60">nhân đạo đã được gieo</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-4">
            <div className="text-2xl font-black text-sky-300">{world.totalMeals}</div>
            <div className="mt-1 text-xs text-white/60">phần quà cho lũ trẻ</div>
          </div>
        </div>

        <h2 className="mt-14 text-xl font-black text-emerald-200">🪦 Nghĩa trang dự án rác</h2>
        <div className="mt-4 flex flex-col gap-2 text-left">
          {destroyedBuildings.map((b, i) => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5">
              <span className="text-lg">🌳</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {i + 1}. {b.name}
                </p>
                <p className="text-[11px] text-white/50">
                  &ldquo;{b.slogan}&rdquo; · sụp đổ{" "}
                  {b.destroyedAt ? new Date(b.destroyedAt).toLocaleDateString("vi-VN") : ""}
                </p>
              </div>
            </div>
          ))}
        </div>

        {donors.length > 0 && (
          <>
            <h2 className="mt-14 text-xl font-black text-emerald-200">💚 Những Người Gieo Mầm</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {donors.map((d) => d.payerName).join(" · ")}
              {" · "}và rất nhiều người gieo mầm ẩn danh khác.
            </p>
          </>
        )}

        <p className="mt-16 text-xs text-white/40">
          Làng Umoja và mọi &ldquo;dự án rác AI&rdquo; trong câu chuyện này đều là hư cấu châm biếm.
          <br />
          Cảm ơn bạn — vì đã tin rằng phá bỏ thứ vô dụng để trồng một cái cây là điều đáng làm.
        </p>
      </div>
    </main>
  );
}
