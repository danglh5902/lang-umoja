import { NextResponse } from "next/server";
import { markDonationPaid } from "@/lib/game";
import { isMockPayment } from "@/lib/payment";

export const dynamic = "force-dynamic";

/** Giả lập "đã chuyển khoản thành công" — chỉ hoạt động khi PAYMENT_PROVIDER=mock. */
export async function POST(req: Request) {
  if (!isMockPayment())
    return NextResponse.json({ error: "Chỉ dùng được ở chế độ mock" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { orderCode?: number } | null;
  const orderCode = Number(body?.orderCode);
  if (!Number.isFinite(orderCode))
    return NextResponse.json({ error: "orderCode không hợp lệ" }, { status: 400 });
  const donation = await markDonationPaid(orderCode);
  if (!donation) return NextResponse.json({ error: "Không tìm thấy giao dịch" }, { status: 404 });
  return NextResponse.json({ orderCode, status: donation.status });
}
