-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slogan" TEXT NOT NULL,
    "lore" TEXT NOT NULL,
    "crimes" TEXT NOT NULL,
    "goalAmount" INTEGER NOT NULL,
    "raisedAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'STANDING',
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    "destroyedAt" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'SEED',
    "contributorName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "backstory" TEXT NOT NULL,
    "hunger" INTEGER NOT NULL DEFAULT 30,
    "thirst" INTEGER NOT NULL DEFAULT 30,
    "joy" INTEGER NOT NULL DEFAULT 20,
    "growthStage" INTEGER NOT NULL DEFAULT 1,
    "totalFedAmount" INTEGER NOT NULL DEFAULT 0,
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    "statsUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Item" (
    "slug" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "hungerEffect" INTEGER NOT NULL DEFAULT 0,
    "thirstEffect" INTEGER NOT NULL DEFAULT 0,
    "joyEffect" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "buildingId" TEXT,
    "childId" TEXT,
    "itemSlug" TEXT,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "orderCode" INTEGER NOT NULL,
    "payerName" TEXT,
    "message" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Donation_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Donation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slogan" TEXT NOT NULL,
    "lore" TEXT NOT NULL,
    "crimes" TEXT NOT NULL,
    "contributorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "donationId" TEXT,
    "buildingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contribution_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "sunsetAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Building_slug_key" ON "Building"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_orderCode_key" ON "Donation"("orderCode");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_donationId_key" ON "Contribution"("donationId");
