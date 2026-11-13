import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin";
import { emitWorldEvent } from "@/lib/events";
import { createBuilding, isSunset } from "@/lib/game";
import { CUSTOM_PRICE_MAX, CUSTOM_PRICE_MIN, DEFAULT_SLOGAN, cleanText, defaultLore, makeCrimes } from "@/lib/buildings";
import { DEFAULT_BUILDINGS } from "@/lib/defaults";
import { priceError } from "@/lib/prices";

export const dynamic = "force-dynamic";

/**
 * Admin thêm tòa nhà rác.
 * - { sample: true }: nạp các tòa mẫu của làng còn thiếu (theo slug), không đụng tòa đang có.
 * - { name, goalAmount (đồng), slogan?, lore?, contributorName? }: thêm một tòa tự đặt giá.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
  if (await isSunset())
    return NextResponse.json({ error: "Thế giới mới đã mở, không thêm tòa được nữa." }, { status: 410 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });

  if (body.sample === true) {
    const result = await prisma.$transaction(async (tx) => {
      const existing = new Set((await tx.building.findMany({ select: { slug: true } })).map((b) => b.slug));
      const occupied = await tx.building.findMany({
        where: { status: { not: "REMOVED" } },
        select: { gridX: true, gridY: true },
      });
      const events: Parameters<typeof emitWorldEvent>[0][] = [];
      let added = 0;
      for (const b of DEFAULT_BUILDINGS) {
        if (existing.has(b.slug)) continue;
        // giữ vị trí gốc nếu ô đó còn trống, không thì để createBuilding tự tìm ô
        const clash = occupied.some((o) => Math.hypot(o.gridX - b.gridX, o.gridY - b.gridY) < 3);
        const created = await createBuilding(tx, {
          name: b.name,
          slogan: b.slogan,
          lore: b.lore,
          crimes: b.crimes,
          goalAmount: b.goalAmount,
          source: "SEED",
          contributorName: null,
          ...(clash ? {} : { gridX: b.gridX, gridY: b.gridY }),
        });
        occupied.push({ gridX: created.building.gridX, gridY: created.building.gridY });
        events.push(...created.events);
        added++;
      }
      return { events, added };
    });
    for (const e of result.events) emitWorldEvent(e);
    return NextResponse.json({ ok: true, added: result.added });
  }

  const name = cleanText(body.name, 40);
  if (name.length < 3) return NextResponse.json({ error: "Tên tòa nhà cần ít nhất 3 ký tự" }, { status: 400 });
  const goalAmount = Number(body.goalAmount);
  const err = priceError(goalAmount, CUSTOM_PRICE_MIN, CUSTOM_PRICE_MAX);
  if (err) return NextResponse.json({ error: `Sức hủy diệt: ${err}` }, { status: 400 });
  const contributorName = cleanText(body.contributorName, 40) || null;

  const created = await prisma.$transaction((tx) =>
    createBuilding(tx, {
      name,
      slogan: cleanText(body.slogan, 100) || DEFAULT_SLOGAN,
      lore: cleanText(body.lore, 500) || defaultLore(name, contributorName),
      crimes: makeCrimes(name, goalAmount),
      goalAmount,
      // có tên kẻ dựng → hiện như tòa của kẻ xấu; không thì là tòa của làng
      source: contributorName ? "COMMUNITY" : "ADMIN",
      contributorName,
    })
  );
  for (const e of created.events) emitWorldEvent(e);
  return NextResponse.json({ ok: true, id: created.building.id });
}
