import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin";
import { isProduction, testToolsEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
  const [contributions, donations, buildings] = await Promise.all([
    prisma.contribution.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.donation.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { building: { select: { name: true } }, child: { select: { name: true } } },
    }),
    prisma.building.findMany({
      where: { status: "STANDING" },
      select: {
        id: true,
        name: true,
        raisedAmount: true,
        goalAmount: true,
        source: true,
        contributorName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return NextResponse.json({
    contributions,
    donations,
    standingBuildings: buildings,
    env: isProduction() ? "production" : "local",
    testTools: testToolsEnabled(),
  });
}
