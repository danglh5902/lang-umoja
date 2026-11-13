import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addBuildingProgress, isSunset } from "@/lib/game";
import { emitWorldEvent } from "@/lib/events";
import { FREE_HIT_AMOUNT, FREE_HIT_COOLDOWN_MS, FREE_MAX_SHARE } from "@/lib/care";
import { formatKind } from "@/lib/format";

export const dynamic = "force-dynamic";

const g = globalThis as unknown as { hammerLast?: Map<string, number> };
const lastHit = g.hammerLast ?? (g.hammerLast = new Map<string, number>());

/** Đập búa miễn phí: mỗi nhát cộng một ít nhân đạo cho tòa, có hồi chờ và trần theo tòa. */
export async function POST(req: Request) {
  if (await isSunset()) return NextResponse.json({ error: "Thế giới mới đã mở." }, { status: 410 });
  const body = (await req.json().catch(() => null)) as { buildingId?: string; name?: string } | null;
  if (!body?.buildingId) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${ip}:${body.buildingId}`;
  const now = Date.now();
  const wait = (lastHit.get(key) ?? 0) + FREE_HIT_COOLDOWN_MS - now;
  if (wait > 0)
    return NextResponse.json(
      { error: `Tay đang mỏi — thử lại sau ${Math.ceil(wait / 1000)} giây`, retryAfterMs: wait },
      { status: 429 }
    );

  const b = await prisma.building.findUnique({ where: { id: body.buildingId } });
  if (!b || b.status !== "STANDING")
    return NextResponse.json({ error: "Tòa nhà này đã bị phá rồi" }, { status: 400 });
  const cap = Math.floor(b.goalAmount * FREE_MAX_SHARE);
  if (b.freeRaised + FREE_HIT_AMOUNT > cap)
    return NextResponse.json(
      {
        error: `Dân làng đã đập hết sức phần miễn phí của tòa này (${Math.round(FREE_MAX_SHARE * 100)}%). Phần còn lại cần góp nhân đạo!`,
        capped: true,
      },
      { status: 409 }
    );

  lastHit.set(key, now);
  if (lastHit.size > 5000) for (const [k, t] of lastHit) if (now - t > FREE_HIT_COOLDOWN_MS) lastHit.delete(k);

  const name = body.name?.normalize("NFC").trim().replace(/\s+/g, " ").slice(0, 50) || null;
  const events = await prisma.$transaction((tx) =>
    addBuildingProgress(tx, b.id, FREE_HIT_AMOUNT, { payerName: name, message: null, free: true })
  );
  for (const e of events) emitWorldEvent(e);
  return NextResponse.json({
    ok: true,
    cooldownMs: FREE_HIT_COOLDOWN_MS,
    message: `Một nhát búa! +${formatKind(FREE_HIT_AMOUNT)}`,
  });
}
