import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ANONYMOUS_NAME } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Chi tiết những gì một người trên Bảng Vinh Danh đã ủng hộ */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.normalize("NFC").trim();
  if (!name) return NextResponse.json({ error: "Thiếu tên" }, { status: 400 });

  const [donations, items] = await Promise.all([
    prisma.donation.findMany({
      where: {
        status: "PAID",
        type: { in: ["DEMOLISH", "FEED"] },
        ...(name === ANONYMOUS_NAME ? { OR: [{ payerName: null }, { payerName: name }] } : { payerName: name }),
      },
      orderBy: { paidAt: "desc" },
      take: 100,
      include: { building: { select: { name: true } }, child: { select: { name: true } } },
    }),
    prisma.item.findMany(),
  ]);
  const itemBySlug = new Map(items.map((i) => [i.slug, i]));

  return NextResponse.json({
    name,
    total: donations.reduce((a, d) => a + d.amount, 0),
    entries: donations.map((d) => {
      const item = d.itemSlug ? itemBySlug.get(d.itemSlug) : undefined;
      return {
        id: d.id,
        type: d.type,
        amount: d.amount,
        at: d.paidAt ?? d.createdAt,
        message: d.message,
        text:
          d.type === "DEMOLISH"
            ? `⚒️ Góp búa phá "${d.building?.name ?? "một tòa nhà"}"`
            : `${item?.emoji ?? "🎁"} Tặng ${d.child?.name ?? "một em bé"} ${item?.name.toLowerCase() ?? "quà"}`,
      };
    }),
  });
}
