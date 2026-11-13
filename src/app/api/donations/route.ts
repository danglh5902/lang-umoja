import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { isSunset, newOrderCode } from "@/lib/game";
import { getPaymentProvider } from "@/lib/payment";
import { formatKind } from "@/lib/format";

export const dynamic = "force-dynamic";

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
  return NextResponse.json({
    orderCode,
    status: donation.status,
    // tòa nhà liên quan: tòa được góp búa, hoặc tòa kẻ xấu vừa dựng bằng khoản phí này
    buildingId: donation.buildingId ?? donation.contribution?.buildingId ?? null,
  });
}
