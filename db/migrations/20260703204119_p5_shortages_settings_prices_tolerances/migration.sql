-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'SHORTAGE_SETTLED';
ALTER TYPE "EventType" ADD VALUE 'SETTING_UPDATED';
ALTER TYPE "EventType" ADD VALUE 'SELLING_PRICE_SET';

-- AlterTable
ALTER TABLE "tanks" ADD COLUMN     "dipToleranceLiters" DECIMAL(12,3),
ADD COLUMN     "dipTolerancePct" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "shortage_settlements" (
    "id" SERIAL NOT NULL,
    "workerId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "recordedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortage_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "selling_price_history" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selling_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shortage_settlements_workerId_date_idx" ON "shortage_settlements"("workerId", "date");

-- CreateIndex
CREATE INDEX "selling_price_history_productId_effectiveAt_idx" ON "selling_price_history"("productId", "effectiveAt");

-- AddForeignKey
ALTER TABLE "shortage_settlements" ADD CONSTRAINT "shortage_settlements_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortage_settlements" ADD CONSTRAINT "shortage_settlements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selling_price_history" ADD CONSTRAINT "selling_price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
