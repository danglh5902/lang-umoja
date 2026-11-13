import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin";
import { emitWorldEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

/**
 * Gỡ một tòa nhà đang đứng (vd: kẻ xấu đặt tên người/công ty có thật, nội dung phản cảm,
 * hoặc admin thêm nhầm). Nếu đó là tòa cuối cùng còn đứng thì thế giới mới mở ra.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
  const { id } = await ctx.params;
  const building = await prisma.building.findUnique({ where: { id } });
  if (!building) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (building.status !== "STANDING")
    return NextResponse.json({ error: "Chỉ gỡ được tòa đang đứng" }, { status: 400 });

  const ended = await prisma.$transaction(async (tx) => {
    await tx.building.update({ where: { id }, data: { status: "REMOVED" } });
    await tx.contribution.updateMany({ where: { buildingId: id }, data: { status: "REJECTED" } });
    const [standing, destroyed] = await Promise.all([
      tx.building.count({ where: { status: "STANDING" } }),
      tx.building.count({ where: { status: "DESTROYED" } }),
    ]);
    if (standing === 0 && destroyed > 0) {
      await tx.worldState.upsert({
        where: { id: 1 },
        create: { id: 1, sunsetAt: new Date() },
        update: { sunsetAt: new Date() },
      });
      return true;
    }
    return false;
  });

  emitWorldEvent({ type: "building-removed", buildingId: id });
  if (ended) emitWorldEvent({ type: "sunset" });
  return NextResponse.json({ ok: true, sunset: ended });
}
