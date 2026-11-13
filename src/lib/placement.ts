import type { Prisma } from "@/generated/prisma/client";

const GRID = 36;

type Tx = Prisma.TransactionClient;

/** Tìm ô trống trên map: tránh làng trung tâm và không sát tòa/trẻ khác */
export async function findFreeSpot(tx: Tx): Promise<{ gridX: number; gridY: number }> {
  const [buildings, children] = await Promise.all([
    tx.building.findMany({ where: { status: { not: "REMOVED" } }, select: { gridX: true, gridY: true } }),
    tx.child.findMany({ select: { gridX: true, gridY: true } }),
  ]);
  const occupied = [...buildings, ...children];
  for (let minGap = 4; minGap >= 2; minGap--) {
    for (let i = 0; i < 400; i++) {
      const x = 2 + Math.floor(Math.random() * (GRID - 4));
      const y = 2 + Math.floor(Math.random() * (GRID - 4));
      if (x >= 12 && x <= 23 && y >= 13 && y <= 23) continue; // chừa làng
      if (occupied.some((o) => Math.hypot(o.gridX - x, o.gridY - y) < minGap)) continue;
      return { gridX: x, gridY: y };
    }
  }
  throw new Error("Làng đã chật kín tòa nhà rác");
}

export function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "toa-nha"
  );
}
