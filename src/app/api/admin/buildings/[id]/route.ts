import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin";
import { emitWorldEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

/** Gỡ một tòa nhà do kẻ xấu dựng (vd: đặt tên người/công ty có thật, nội dung phản cảm) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
  const { id } = await ctx.params;
  const building = await prisma.building.findUnique({ where: { id } });
  if (!building) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (building.source !== "COMMUNITY")
    return NextResponse.json({ error: "Chỉ gỡ được tòa do người dùng dựng" }, { status: 400 });

  await prisma.building.update({ where: { id }, data: { status: "REMOVED" } });
  await prisma.contribution.updateMany({ where: { buildingId: id }, data: { status: "REJECTED" } });
  emitWorldEvent({ type: "building-removed", buildingId: id });
  return NextResponse.json({ ok: true });
}
