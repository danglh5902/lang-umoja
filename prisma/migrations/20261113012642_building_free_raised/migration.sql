-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slogan" TEXT NOT NULL,
    "lore" TEXT NOT NULL,
    "crimes" TEXT NOT NULL,
    "goalAmount" INTEGER NOT NULL,
    "raisedAmount" INTEGER NOT NULL DEFAULT 0,
    "freeRaised" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'STANDING',
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    "destroyedAt" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'SEED',
    "contributorName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Building" ("contributorName", "createdAt", "crimes", "destroyedAt", "goalAmount", "gridX", "gridY", "id", "lore", "name", "raisedAmount", "slogan", "slug", "source", "status") SELECT "contributorName", "createdAt", "crimes", "destroyedAt", "goalAmount", "gridX", "gridY", "id", "lore", "name", "raisedAmount", "slogan", "slug", "source", "status" FROM "Building";
DROP TABLE "Building";
ALTER TABLE "new_Building" RENAME TO "Building";
CREATE UNIQUE INDEX "Building_slug_key" ON "Building"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
