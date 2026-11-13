import { prisma } from "./db";
import { emitWorldEvent } from "./events";
import { findFreeSpot, slugify } from "./placement";
import { ANONYMOUS_NAME } from "./format";

const ACTIVE = { status: { not: "REMOVED" } } as const;

/** Act I "Bụi" = 1, Act II "Mầm" = 2, Act III "Suối" = 3, Thế Giới Mới = 4 */
export function computePhase(destroyed: number, total: number): number {
  if (total <= 0) return 1;
  if (destroyed >= total) return 4;
  const r = destroyed / total;
  if (r < 1 / 3) return 1;
  if (r < 2 / 3) return 2;
  return 3;
}

export const GROWTH_THRESHOLDS = { stage2: 100000, stage3: 300000 };

export function growthStageFor(totalFedAmount: number): number {
  if (totalFedAmount >= GROWTH_THRESHOLDS.stage3) return 3;
  if (totalFedAmount >= GROWTH_THRESHOLDS.stage2) return 2;
  return 1;
}

/** Chỉ số giảm dần theo thời gian thực (tính lười — chỉ tính khi đọc/ghi). */
export function decayedStats(child: {
  hunger: number;
  thirst: number;
  joy: number;
  statsUpdatedAt: Date;
}) {
  const minutes = Math.max(0, (Date.now() - child.statsUpdatedAt.getTime()) / 60000);
  return {
    hunger: Math.max(0, Math.round(child.hunger - minutes / 20)),
    thirst: Math.max(0, Math.round(child.thirst - minutes / 15)),
    joy: Math.max(0, Math.round(child.joy - minutes / 30)),
  };
}

export async function isSunset(): Promise<boolean> {
  const world = await prisma.worldState.findUnique({ where: { id: 1 } });
  return Boolean(world?.sunsetAt);
}

/** Gộp các dòng trùng tên (vd: không ghi tên + ai đó tự gõ "Người ẩn danh"), sắp theo tổng tiền */
function mergeHonor(rows: { name: string; total: number; count: number }[]) {
  const map = new Map<string, { name: string; total: number; count: number }>();
  for (const r of rows) {
    const cur = map.get(r.name);
    if (cur) {
      cur.total += r.total;
      cur.count += r.count;
    } else map.set(r.name, { ...r });
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export async function getWorld() {
  const [buildings, children, items, world, paidAgg, feedCount, honorRaw, destroyAgg] = await Promise.all([
    prisma.building.findMany({ where: ACTIVE, orderBy: { createdAt: "asc" } }),
    prisma.child.findMany(),
    prisma.item.findMany(),
    prisma.worldState.findUnique({ where: { id: 1 } }),
    // nhân đạo = tiền giúp làng (phá dỡ + nuôi trẻ); phí của kẻ xấu tính riêng là hủy diệt
    prisma.donation.aggregate({
      where: { status: "PAID", type: { in: ["DEMOLISH", "FEED"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.donation.count({ where: { status: "PAID", type: "FEED" } }),
    // Bảng vinh danh: chỉ tính tiền giúp làng (phá dỡ + nuôi trẻ), không tính phí của kẻ xấu
    prisma.donation.groupBy({
      by: ["payerName"],
      where: { status: "PAID", type: { in: ["DEMOLISH", "FEED"] } },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 50,
    }),
    prisma.donation.aggregate({ where: { status: "PAID", type: "CONTRIBUTE_FEE" }, _sum: { amount: true } }),
  ]);
  const destroyed = buildings.filter((b) => b.status === "DESTROYED").length;
  const phase = computePhase(destroyed, buildings.length);
  return {
    phase,
    sunsetAt: world?.sunsetAt ?? null,
    totalBuildings: buildings.length,
    destroyedCount: destroyed,
    totalRaised: paidAgg._sum.amount ?? 0,
    totalDestroy: destroyAgg._sum.amount ?? 0,
    totalDonations: paidAgg._count,
    totalMeals: feedCount,
    buildings: buildings.map((b) => ({
      ...b,
      crimes: JSON.parse(b.crimes) as { waterPerDay: number; powerPerDay: number; landTaken: number },
    })),
    children: children.map((c) => ({ ...c, ...decayedStats(c) })),
    items,
    honor: mergeHonor(
      honorRaw.map((h) => ({
        name: h.payerName ?? ANONYMOUS_NAME,
        total: h._sum.amount ?? 0,
        count: h._count._all,
      }))
    ),
  };
}

/** Sinh orderCode 9 chữ số (vừa Int32, hợp lệ với PayOS), thử lại nếu trùng. */
export async function newOrderCode(): Promise<number> {
  for (let i = 0; i < 10; i++) {
    const code = 100_000_000 + Math.floor(Math.random() * 900_000_000);
    const existing = await prisma.donation.findUnique({ where: { orderCode: code } });
    if (!existing) return code;
  }
  throw new Error("Không sinh được orderCode");
}

/**
 * Xác nhận thanh toán thành công (từ webhook PayOS hoặc mock-pay).
 * Idempotent: gọi lại với orderCode đã PAID sẽ không làm gì.
 */
export async function markDonationPaid(orderCode: number) {
  const result = await prisma.$transaction(async (tx) => {
    const donation = await tx.donation.findUnique({
      where: { orderCode },
      include: { building: true, child: true, contribution: true },
    });
    if (!donation) return { events: [] as Parameters<typeof emitWorldEvent>[0][], donation: null };
    if (donation.status === "PAID") return { events: [], donation };

    const events: Parameters<typeof emitWorldEvent>[0][] = [];
    const paid = await tx.donation.update({
      where: { id: donation.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    if (donation.type === "DEMOLISH" && donation.building) {
      const before = await tx.building.findUnique({ where: { id: donation.building.id } });
      const raised = (before?.raisedAmount ?? 0) + donation.amount;
      const prevPhaseCounts = await tx.building.count({ where: { status: "DESTROYED" } });
      const total = await tx.building.count({ where: ACTIVE });
      const prevPhase = computePhase(prevPhaseCounts, total);

      const nowDestroyed = raised >= donation.building.goalAmount && before?.status === "STANDING";
      const building = await tx.building.update({
        where: { id: donation.building.id },
        data: {
          raisedAmount: raised,
          ...(nowDestroyed ? { status: "DESTROYED", destroyedAt: new Date() } : {}),
        },
      });

      events.push({
        type: "building-progress",
        buildingId: building.id,
        slug: building.slug,
        name: building.name,
        raisedAmount: building.raisedAmount,
        goalAmount: building.goalAmount,
        payerName: donation.payerName,
        amount: donation.amount,
        message: donation.message,
      });

      if (nowDestroyed) {
        const destroyedCount = prevPhaseCounts + 1;
        events.push({
          type: "building-destroyed",
          buildingId: building.id,
          slug: building.slug,
          name: building.name,
          destroyedCount,
          total,
        });
        const newPhase = computePhase(destroyedCount, total);
        if (newPhase !== prevPhase) events.push({ type: "phase-changed", phase: newPhase });
        if (destroyedCount >= total) {
          await tx.worldState.update({ where: { id: 1 }, data: { sunsetAt: new Date() } });
          events.push({ type: "sunset" });
        }
      }
    }

    if (donation.type === "FEED" && donation.child && donation.itemSlug) {
      const item = await tx.item.findUnique({ where: { slug: donation.itemSlug } });
      if (item) {
        const current = decayedStats(donation.child);
        const totalFed = donation.child.totalFedAmount + donation.amount;
        const child = await tx.child.update({
          where: { id: donation.child.id },
          data: {
            hunger: Math.min(100, current.hunger + item.hungerEffect),
            thirst: Math.min(100, current.thirst + item.thirstEffect),
            joy: Math.min(100, current.joy + item.joyEffect),
            totalFedAmount: totalFed,
            growthStage: growthStageFor(totalFed),
            statsUpdatedAt: new Date(),
          },
        });
        events.push({
          type: "child-fed",
          childId: child.id,
          childName: child.name,
          itemSlug: item.slug,
          itemName: item.name,
          payerName: donation.payerName,
          amount: donation.amount,
          hunger: child.hunger,
          thirst: child.thirst,
          joy: child.joy,
          growthStage: child.growthStage,
        });
      }
    }

    if (donation.type === "CONTRIBUTE_FEE" && donation.contribution) {
      // Kẻ xấu đã trả phí → tòa nhà rác mọc lên ngay giữa làng (admin có thể gỡ sau)
      const c = donation.contribution;
      const spot = await findFreeSpot(tx);
      // sức hủy diệt của tòa = số hủy diệt kẻ xấu đã bỏ ra → cần đúng chừng ấy nhân đạo để phá
      const goalAmount = donation.amount;
      let slug = slugify(c.name);
      if (await tx.building.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
      const building = await tx.building.create({
        data: {
          slug,
          name: c.name,
          slogan: c.slogan,
          lore: c.lore,
          crimes: c.crimes,
          goalAmount,
          gridX: spot.gridX,
          gridY: spot.gridY,
          source: "COMMUNITY",
          contributorName: c.contributorName,
        },
      });
      await tx.contribution.update({
        where: { id: c.id },
        data: { status: "APPROVED", buildingId: building.id },
      });
      events.push({
        type: "building-created",
        buildingId: building.id,
        slug: building.slug,
        name: building.name,
        contributorName: building.contributorName,
      });
      // tòa mới kéo thế giới lùi lại nếu cần (vd: Hồi III → Hồi II)
      const destroyedNow = await tx.building.count({ where: { status: "DESTROYED" } });
      const totalNow = await tx.building.count({ where: ACTIVE });
      const newPhase = computePhase(destroyedNow, totalNow);
      if (newPhase !== computePhase(destroyedNow, totalNow - 1)) {
        events.push({ type: "phase-changed", phase: newPhase });
      }
    }

    return { events, donation: paid };
  });

  for (const e of result.events) emitWorldEvent(e);
  return result.donation;
}
