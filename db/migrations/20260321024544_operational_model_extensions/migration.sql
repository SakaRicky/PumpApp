-- AlterTable
ALTER TABLE "shift_product_stocks" ADD COLUMN     "receivedQty" DECIMAL(12,3) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "dailyCashShortfallAmount" DECIMAL(10,2),
ADD COLUMN     "dailyCashShortfallNote" TEXT,
ADD COLUMN     "dailyCashShortfallRecordedAt" TIMESTAMP(3),
ADD COLUMN     "dailyCashShortfallRecordedById" INTEGER,
ADD COLUMN     "shopAccountableWorkerId" INTEGER;

-- CreateTable
CREATE TABLE "weekly_inventory_closes" (
    "id" SERIAL NOT NULL,
    "weekStart" DATE NOT NULL,
    "weekEnd" DATE NOT NULL,
    "workerId" INTEGER NOT NULL,
    "enforcedShortfall" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "physicalCountAt" TIMESTAMP(3),
    "recordedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_inventory_closes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_inventory_count_lines" (
    "id" SERIAL NOT NULL,
    "weeklyInventoryCloseId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "physicalQty" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "weekly_inventory_count_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_inventory_closes_weekStart_weekEnd_idx" ON "weekly_inventory_closes"("weekStart", "weekEnd");

-- CreateIndex
CREATE INDEX "weekly_inventory_closes_workerId_idx" ON "weekly_inventory_closes"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_inventory_closes_weekStart_workerId_key" ON "weekly_inventory_closes"("weekStart", "workerId");

-- CreateIndex
CREATE INDEX "weekly_inventory_count_lines_weeklyInventoryCloseId_idx" ON "weekly_inventory_count_lines"("weeklyInventoryCloseId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_inventory_count_lines_weeklyInventoryCloseId_product_key" ON "weekly_inventory_count_lines"("weeklyInventoryCloseId", "productId");

-- CreateIndex
CREATE INDEX "shifts_shopAccountableWorkerId_idx" ON "shifts"("shopAccountableWorkerId");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_shopAccountableWorkerId_fkey" FOREIGN KEY ("shopAccountableWorkerId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_dailyCashShortfallRecordedById_fkey" FOREIGN KEY ("dailyCashShortfallRecordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_inventory_closes" ADD CONSTRAINT "weekly_inventory_closes_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_inventory_closes" ADD CONSTRAINT "weekly_inventory_closes_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_inventory_count_lines" ADD CONSTRAINT "weekly_inventory_count_lines_weeklyInventoryCloseId_fkey" FOREIGN KEY ("weeklyInventoryCloseId") REFERENCES "weekly_inventory_closes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_inventory_count_lines" ADD CONSTRAINT "weekly_inventory_count_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
