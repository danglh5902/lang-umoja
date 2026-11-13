import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { decayedStats, isSunset, markDonationPaid, newOrderCode } from "@/lib/game";
import { FEED_PER_HOUR, refuseReason } from "@/lib/care";
import { getPaymentProvider, isMockPayment } from "@/lib/payment";
import { formatKind } from "@/lib/format";

export const dynamic = "force-dynamic";

// số lần tặng quà theo IP + em bé trong 1 giờ (bộ nhớ, app chỉ chạy 1 instance)
const gf = globalThis as unknown as { feedLog?: Map<string, number[]> };
const feedLog = gf.feedLog ?? (gf.feedLog = new Map<string, number[]>());

// lần cuối hỏi PayOS cho mỗi đơn (tránh gọi API mỗi 3 giây khi hộp QR đang mở)
const gc = globalThis as unknown as { payosCheck?: Map<number, number> };
const lastCheck = gc.payosCheck ?? (gc.payosCheck = new Map<number, number>());

const MIN_AMOUNT = 5000;
const MAX_AMOUNT = 10_000_000;

export async function POST(req: Request) {
  if (await isSunset()) {
    return NextResponse.json(
      { error: "Thế giới mới đã mở. Website đã hoàn thành sứ mệnh." },
      { status: 410 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    type?: string;
    buildingId?: string;
    childId?: string;
    itemSlug?: string;
    amount?: number;
    payerName?: string;
    message?: string;
  } | null;
  if (!body?.type) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });

  const payerName = body.payerName?.normalize("NFC").trim().replace(/\s+/g, " ").slice(0, 50) || null;
  const message = body.message?.trim().slice(0, 200) || null;

  let amount = 0;
  let buildingId: string | null = null;
  let childId: string | null = null;
  let itemSlug: string | null = null;
  let description = "";

  if (body.type === "DEMOLISH") {
    if (!body.buildingId) return NextResponse.json({ error: "Thiếu tòa nhà" }, { status: 400 });
    const building = await prisma.building.findUnique({ where: { id: body.buildingId } });
    if (!building) return NextResponse.json({ error: "Không tìm thấy tòa nhà" }, { status: 404 });
    if (building.status !== "STANDING")
      return NextResponse.json({ error: "Tòa nhà này đã bị phá rồi" }, { status: 400 });
    amount = Math.round(Number(body.amount));
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT)
      return NextResponse.json(
        { error: `Mỗi lần góp từ ${formatKind(MIN_AMOUNT)} đến ${formatKind(MAX_AMOUNT)}` },
        { status: 400 }
      );
    buildingId = building.id;
    description = `PHA ${building.slug.slice(0, 20)}`;
  } else if (body.type === "FEED") {
    if (!body.childId || !body.itemSlug)
      return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
    const [child, item] = await Promise.all([
      prisma.child.findUnique({ where: { id: body.childId } }),
      prisma.item.findUnique({ where: { slug: body.itemSlug } }),
    ]);
    if (!child || !item) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    // quy tắc: chỉ nhận món khi em đang cần
    const reason = refuseReason(
      child.name,
      decayedStats(child),
      { hunger: item.hungerEffect, thirst: item.thirstEffect, joy: item.joyEffect }
    );
    if (reason) return NextResponse.json({ error: reason }, { status: 409 });
    // quy tắc: giới hạn số món mỗi giờ
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    const key = `${ip}:${child.id}`;
    const now = Date.now();
    const recent = (feedLog.get(key) ?? []).filter((t) => now - t < 3_600_000);
    if (recent.length >= FEED_PER_HOUR)
      return NextResponse.json(
        { error: `Bạn đã tặng ${child.name} ${FEED_PER_HOUR} món trong 1 giờ qua. Hãy để em nghỉ một lát nhé!` },
        { status: 429 }
      );
    recent.push(now);
    feedLog.set(key, recent);
    amount = item.price; // giá luôn do server quyết định
    childId = child.id;
    itemSlug = item.slug;
    description = `NUOI ${child.name.slice(0, 18)}`;
  } else {
    return NextResponse.json({ error: "Loại giao dịch không hợp lệ" }, { status: 400 });
  }

  const orderCode = await newOrderCode();
  const provider = await getPaymentProvider();
  const payment = await provider.createPayment({ orderCode, amount, description });

  await prisma.donation.create({
    data: {
      type: body.type,
      buildingId,
      childId,
      itemSlug,
      amount,
      orderCode,
      payerName,
      message,
    },
  });

  const qrDataUrl = await QRCode.toDataURL(payment.qrString || String(orderCode), {
    width: 360,
    margin: 1,
  });

  return NextResponse.json({
    orderCode,
    amount,
    qrDataUrl,
    checkoutUrl: payment.checkoutUrl,
    provider: provider.name,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderCode = Number(searchParams.get("orderCode"));
  if (!Number.isFinite(orderCode))
    return NextResponse.json({ error: "orderCode không hợp lệ" }, { status: 400 });
  const donation = await prisma.donation.findUnique({
    where: { orderCode },
    include: { contribution: { select: { buildingId: true } } },
  });
  if (!donation) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // Dự phòng khi webhook PayOS không tới: tự hỏi PayOS (tối đa 1 lần / 10 giây / đơn)
  let status = donation.status;
  if (status === "PENDING" && !isMockPayment() && Date.now() - (lastCheck.get(orderCode) ?? 0) > 10_000) {
    lastCheck.set(orderCode, Date.now());
    try {
      const { PayOSProvider } = await import("@/lib/payment/payos");
      const link = await new PayOSProvider().client.paymentRequests.get(orderCode);
      if (link.status === "PAID") {
        await markDonationPaid(orderCode); // idempotent, webhook tới sau cũng không cộng 2 lần
        status = "PAID";
        lastCheck.delete(orderCode);
      }
    } catch (e) {
      console.error("PayOS get payment failed:", e);
    }
  }

  return NextResponse.json({
    orderCode,
    status,
    // tòa nhà liên quan: tòa được góp búa, hoặc tòa kẻ xấu vừa dựng bằng khoản phí này
    buildingId: donation.buildingId ?? donation.contribution?.buildingId ?? null,
  });
}
