import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decayedStats, isSunset } from "@/lib/game";
import { emitWorldEvent } from "@/lib/events";
import { CARE_ACTIONS, CARE_COOLDOWN_MS, refuseReason, type CareKind } from "@/lib/care";

export const dynamic = "force-dynamic";

// Giới hạn trong bộ nhớ (app chỉ chạy 1 instance): mỗi IP + em bé chờ CARE_COOLDOWN_MS giữa hai lần
const g = globalThis as unknown as { careLast?: Map<string, number> };
const lastCare = g.careLast ?? (g.careLast = new Map<string, number>());

export async function POST(req: Request) {
  if (await isSunset()) {
    return NextResponse.json({ error: "Thế giới mới đã mở." }, { status: 410 });
  }
  const body = (await req.json().catch(() => null)) as {
    childId?: string;
    kind?: string;
    name?: string;
  } | null;
  const action = body?.kind ? CARE_ACTIONS[body.kind as CareKind] : undefined;
  if (!body?.childId || !action) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${ip}:${body.childId}`;
  const now = Date.now();
  const wait = (lastCare.get(key) ?? 0) + CARE_COOLDOWN_MS - now;
  if (wait > 0) {
    return NextResponse.json(
      { error: `Em cần nghỉ một chút — thử lại sau ${Math.ceil(wait / 1000)} giây`, retryAfterMs: wait },
      { status: 429 }
    );
  }

  const current = await prisma.child.findUnique({ where: { id: body.childId } });
  if (!current) return NextResponse.json({ error: "Không tìm thấy em bé" }, { status: 404 });

  const reason = refuseReason(current.name, decayedStats(current), action);
  if (reason) return NextResponse.json({ error: reason }, { status: 409 });

  lastCare.set(key, now);
  if (lastCare.size > 5000) for (const [k, t] of lastCare) if (now - t > CARE_COOLDOWN_MS) lastCare.delete(k);

  const s = decayedStats(current);
  const child = await prisma.child.update({
    where: { id: current.id },
    data: {
      hunger: Math.min(100, s.hunger + action.hunger),
      thirst: Math.min(100, s.thirst + action.thirst),
      joy: Math.min(100, s.joy + action.joy),
      statsUpdatedAt: new Date(),
    },
  });
  const name = body.name?.normalize("NFC").trim().replace(/\s+/g, " ").slice(0, 50) || null;
  emitWorldEvent({
    type: "child-cared",
    childId: child.id,
    childName: child.name,
    kind: body.kind as CareKind,
    name,
    hunger: child.hunger,
    thirst: child.thirst,
    joy: child.joy,
  });
  return NextResponse.json({ ok: true, cooldownMs: CARE_COOLDOWN_MS });
}
