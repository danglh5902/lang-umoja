import { NextResponse } from "next/server";
import { markDonationPaid } from "@/lib/game";

export const dynamic = "force-dynamic";

/** Webhook PayOS: verify chữ ký rồi đánh dấu giao dịch đã thanh toán. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false }, { status: 400 });

  if (process.env.PAYMENT_PROVIDER !== "payos") {
    // Chế độ mock: nhận và bỏ qua (để PayOS xác nhận URL webhook vẫn trả 200)
    return NextResponse.json({ success: true });
  }

  try {
    const { PayOSProvider } = await import("@/lib/payment/payos");
    const provider = new PayOSProvider();
    const data = await provider.client.webhooks.verify(body);
    const orderCode = Number((data as { orderCode?: number | string }).orderCode);
    // orderCode 123 là webhook test của PayOS khi đăng ký URL
    if (Number.isFinite(orderCode) && orderCode !== 123) {
      await markDonationPaid(orderCode);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PayOS webhook verify failed:", e);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
