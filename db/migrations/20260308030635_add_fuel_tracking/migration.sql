-- AlterTable
ALTER TABLE "pumps" ADD COLUMN     "tankId" INTEGER;

-- CreateTable
CREATE TABLE "fuel_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tanks" (
    "id" SERIAL NOT NULL,
    "fuelTypeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" DECIMAL(12,3),
    "theoreticalQuantity" DECIMAL(12,3),
    "actualQuantity" DECIMAL(12,3),
    "actualQuantityRecordedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tanks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_deliveries" (
    "id" SERIAL NOT NULL,
    "tankId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tanks_fuelTypeId_idx" ON "tanks"("fuelTypeId");

-- CreateIndex
CREATE INDEX "fuel_deliveries_tankId_deliveredAt_idx" ON "fuel_deliveries"("tankId", "deliveredAt");

-- CreateIndex
CREATE INDEX "pumps_tankId_idx" ON "pumps"("tankId");

-- AddForeignKey
ALTER TABLE "tanks" ADD CONSTRAINT "tanks_fuelTypeId_fkey" FOREIGN KEY ("fuelTypeId") REFERENCES "fuel_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_deliveries" ADD CONSTRAINT "fuel_deliveries_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pumps" ADD CONSTRAINT "pumps_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
