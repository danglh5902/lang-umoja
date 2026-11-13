import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin";
import { DESTRUCTION_LEVELS } from "@/lib/format";
import {
  ITEM_PRICE_MAX,
  ITEM_PRICE_MIN,
  LEVEL_PRICE_MAX,
  LEVEL_PRICE_MIN,
  getDestructionLevels,
  priceError,
} from "@/lib/prices";

export const dynamic = "force-dynamic";

/**
 * Đổi giá quà tặng và giá các mức hủy diệt.
 * Chỉ áp dụng cho đơn tạo SAU khi đổi: đơn đang chờ và tòa đã dựng giữ nguyên giá cũ.
 * Body: { items?: { slug, price }[], levels?: { id, amount }[] } — số tiền tính bằng đồng.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    items?: { slug: string; price: number }[];
    levels?: { id: number; amount: number }[];
  } | null;
  if (!body) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });

  const items = body.items ?? [];
  const known = new Set((await prisma.item.findMany({ select: { slug: true } })).map((i) => i.slug));
  for (const it of items) {
    if (!known.has(it.slug)) return NextResponse.json({ error: `Không có món "${it.slug}"` }, { status: 400 });
    const err = priceError(it.price, ITEM_PRICE_MIN, ITEM_PRICE_MAX);
    if (err) return NextResponse.json({ error: `${it.slug}: ${err}` }, { status: 400 });
  }

  const levels = body.levels ?? [];
  if (levels.length) {
    const merged = new Map((await getDestructionLevels()).map((l) => [l.id, l.amount]));
    for (const l of levels) {
      if (!DESTRUCTION_LEVELS.some((d) => d.id === l.id))
        return NextResponse.json({ error: `Không có mức ${l.id}` }, { status: 400 });
      const err = priceError(l.amount, LEVEL_PRICE_MIN, LEVEL_PRICE_MAX);
      if (err) return NextResponse.json({ error: `Mức ${l.id}: ${err}` }, { status: 400 });
      merged.set(l.id, l.amount);
    }
    // mức sau phải đắt hơn mức trước (nhãn mức của tòa nhà dựa vào thứ tự này)
    const ordered = DESTRUCTION_LEVELS.map((d) => merged.get(d.id)!);
    if (ordered.some((a, i) => i > 0 && a <= ordered[i - 1]))
      return NextResponse.json({ error: "Mức sau phải có giá cao hơn mức trước" }, { status: 400 });
  }

  await prisma.$transaction([
    ...items.map((it) => prisma.item.update({ where: { slug: it.slug }, data: { price: it.price } })),
    ...levels.map((l) =>
      prisma.levelPrice.upsert({ where: { id: l.id }, create: { id: l.id, amount: l.amount }, update: { amount: l.amount } })
    ),
  ]);
  return NextResponse.json({ ok: true });
}
