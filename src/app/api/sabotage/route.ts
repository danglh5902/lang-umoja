import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { isSunset, newOrderCode } from "@/lib/game";
import { getPaymentProvider } from "@/lib/payment";
import { getDestructionLevels } from "@/lib/prices";

export const dynamic = "force-dynamic";

function hashStr(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

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
  } | null;

  // mức hủy diệt = phí kẻ xấu trả = sức hủy diệt của tòa (số nhân đạo cần để phá)
  const level = (await getDestructionLevels()).find((l) => l.id === Number(body?.level));
  if (!level) {
    return NextResponse.json({ error: "Hãy chọn một mức hủy diệt" }, { status: 400 });
  }

  const name = body?.name?.normalize("NFC").trim().replace(/\s+/g, " ").slice(0, 40);
  if (!name || name.length < 3) {
    return NextResponse.json({ error: "Tên tòa nhà cần ít nhất 3 ký tự" }, { status: 400 });
  }
  const villainName = body?.villainName?.normalize("NFC").trim().replace(/\s+/g, " ").slice(0, 40) || null;
  const slogan = body?.slogan?.trim().slice(0, 100) || "Không ai biết nó dùng để làm gì.";
  const lore =
    body?.lore?.trim().slice(0, 500) ||
    `Một đêm nọ, ${villainName ? `kẻ tên ${villainName}` : "một kẻ giấu mặt"} lặng lẽ đổ bê tông giữa ruộng ngô của làng và dựng lên "${name}". Không ai biết nó làm gì — chỉ biết từ ngày nó mọc lên, quạt tản nhiệt rít suốt đêm và giếng làng cạn thêm một gang tay.`;

  // "tội trạng" ngẫu nhiên nhưng ổn định theo tên
  const h = hashStr(name);
  // mức hủy diệt càng cao, tội trạng càng nặng
  const scale = level.amount / 50000;
  const crimes = JSON.stringify({
    waterPerDay: Math.round((20000 + (h % 40) * 500) * scale),
    powerPerDay: Math.round((800 + (h % 37) * 20) * scale),
    landTaken: Math.round((350 + (h % 23) * 15) * scale),
  });

  const orderCode = await newOrderCode();
  const provider = await getPaymentProvider();
  const payment = await provider.createPayment({
    orderCode,
    amount: level.amount,
    description: "PHA LANG UMOJA",
  });

  const donation = await prisma.donation.create({
    data: { type: "CONTRIBUTE_FEE", amount: level.amount, orderCode, payerName: villainName },
  });
  await prisma.contribution.create({
    data: { name, slogan, lore, crimes, contributorName: villainName, donationId: donation.id },
  });

  const qrDataUrl = await QRCode.toDataURL(payment.qrString || String(orderCode), { width: 360, margin: 1 });

  return NextResponse.json({
    orderCode,
    amount: level.amount,
    qrDataUrl,
    checkoutUrl: payment.checkoutUrl,
    provider: provider.name,
  });
}
