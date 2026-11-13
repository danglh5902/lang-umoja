import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { DEFAULT_BUILDINGS as BUILDINGS, DEFAULT_CHILDREN as CHILDREN, DEFAULT_ITEMS as ITEMS } from "../src/lib/defaults";

const adapter = new PrismaBetterSqlite3({
  url: `file:${process.env.DATABASE_PATH ?? "./prisma/dev.db"}`,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Chốt an toàn: seed XÓA SẠCH dữ liệu. Trên online (NODE_ENV=production) chỉ cho chạy khi database còn trống
  // (lần deploy đầu), trừ khi cố ý ghi đè bằng FORCE_SEED=1.
  if (process.env.NODE_ENV === "production" && process.env.FORCE_SEED !== "1") {
    const existing = await prisma.building.count();
    if (existing > 0) {
      console.error(
        `⛔ Từ chối seed: database online đang có ${existing} tòa nhà và dữ liệu thật.\n` +
          `   Seed sẽ xóa sạch mọi lượt ủng hộ. Nếu thật sự muốn làm lại từ đầu, chạy kèm FORCE_SEED=1.`
      );
      process.exitCode = 1;
      return;
    }
  }

  await prisma.donation.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.building.deleteMany();
  await prisma.child.deleteMany();
  await prisma.item.deleteMany();
  await prisma.worldState.deleteMany();

  // các tòa đã chiếm đất từ lâu — mỗi tòa xuất hiện ở một thời điểm khác nhau trong quá khứ
  const DAY = 24 * 60 * 60 * 1000;
  await prisma.building.createMany({
    data: BUILDINGS.map((b, i) => ({
      ...b,
      createdAt: new Date(Date.now() - (6 + ((i * 17) % 40)) * DAY - ((i * 7) % 24) * 3600000),
    })),
  });
  await prisma.child.createMany({ data: CHILDREN });
  await prisma.item.createMany({ data: ITEMS });
  await prisma.worldState.create({ data: { id: 1 } });

  console.log(
    `Seeded: ${BUILDINGS.length} buildings, ${CHILDREN.length} children, ${ITEMS.length} items.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
