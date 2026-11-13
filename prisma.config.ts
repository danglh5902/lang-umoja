import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: `file:${process.env.DATABASE_PATH ?? "./prisma/dev.db"}`,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
