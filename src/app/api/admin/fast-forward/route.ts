import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin";
import { markDonationPaid, newOrderCode } from "@/lib/game";

export const dynamic = "force-dynamic";

/**
 * Công cụ test: nạp đủ số tiền còn thiếu cho một tòa nhà (hoặc tòa đầu tiên còn đứng)
 * bằng một donation giả đã PAID — chạy qua đúng pipeline markDonationPaid
 * nên animation, phase, sunset đều hoạt động như thật.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { buildingId?: string } | null;

  const building = body?.buildingId
    ? await prisma.building.findUnique({ where: { id: body.buildingId } })
    : await prisma.building.findFirst({ where: { status: "STANDING" }, orderBy: { createdAt: "asc" } });

  if (!building || building.status !== "STANDING")
    return NextResponse.json({ error: "Không còn tòa nhà nào đang đứng" }, { status: 404 });

  const remaining = Math.max(1000, building.goalAmount - building.raisedAmount);
  const orderCode = await newOrderCode();
  await prisma.donation.create({
    data: {
      type: "DEMOLISH",
      buildingId: building.id,
      amount: remaining,
      orderCode,
      payerName: "Quản trị viên (test)",
    },
  });
  await markDonationPaid(orderCode);

  return NextResponse.json({ ok: true, building: building.name, amount: remaining });
}
