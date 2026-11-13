import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { isSunset, newOrderCode } from "@/lib/game";
import { getPaymentProvider } from "@/lib/payment";
import { getDestructionLevels, priceError } from "@/lib/prices";
import { CUSTOM_PRICE_MAX, CUSTOM_PRICE_MIN, DEFAULT_SLOGAN, cleanText, defaultLore, makeCrimes } from "@/lib/buildings";

export const dynamic = "force-dynamic";

/**
 * "Phá hủy làng": kẻ xấu trả phí để dựng một tòa nhà rác (hư cấu) giữa làng.
 * Tòa nhà mọc lên ngay khi thanh toán được xác nhận (xem markDonationPaid).
 */
export async function POST(req: Request) {
  if (await isSunset()) {
    return NextResponse.json(
      { error: "Thế giới mới đã mở. Không còn chỗ cho kẻ xấu nữa." },
      { status: 410 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    villainName?: string;
    slogan?: string;
    lore?: string;
    level?: number;
    /** giá tự đặt (đồng), thay cho chọn mức */
    customAmount?: number;
  } | null;

  // sức hủy diệt = phí kẻ xấu trả = số nhân đạo dân làng cần góp để phá
  let amount: number;
  if (body?.customAmount !== undefined && body?.customAmount !== null) {
    amount = Number(body.customAmount);
    const err = priceError(amount, CUSTOM_PRICE_MIN, CUSTOM_PRICE_MAX, "hủy diệt");
    if (err) return NextResponse.json({ error: `Sức hủy diệt tự chọn: ${err}` }, { status: 400 });
  } else {
    const level = (await getDestructionLevels()).find((l) => l.id === Number(body?.level));
    if (!level) return NextResponse.json({ error: "Hãy chọn một mức hủy diệt" }, { status: 400 });
    amount = level.amount;
  }

  const name = cleanText(body?.name, 40);
  if (name.length < 3) {
    return NextResponse.json({ error: "Tên tòa nhà cần ít nhất 3 ký tự" }, { status: 400 });
  }
  const villainName = cleanText(body?.villainName, 40) || null;
  const slogan = body?.slogan?.trim().slice(0, 100) || DEFAULT_SLOGAN;
  const lore = body?.lore?.trim().slice(0, 500) || defaultLore(name, villainName);
  const crimes = makeCrimes(name, amount);

  const orderCode = await newOrderCode();
  const provider = await getPaymentProvider();
  const payment = await provider.createPayment({
    orderCode,
    amount: amount,
    description: "PHA LANG UMOJA",
  });

  const donation = await prisma.donation.create({
    data: { type: "CONTRIBUTE_FEE", amount: amount, orderCode, payerName: villainName },
  });
  await prisma.contribution.create({
    data: { name, slogan, lore, crimes, contributorName: villainName, donationId: donation.id },
  });

  const qrDataUrl = await QRCode.toDataURL(payment.qrString || String(orderCode), { width: 360, margin: 1 });

  return NextResponse.json({
    orderCode,
    amount: amount,
    qrDataUrl,
    checkoutUrl: payment.checkoutUrl,
    provider: provider.name,
  });
}
