-- CreateTable
CREATE TABLE "tank_level_readings" (
    "id" SERIAL NOT NULL,
    "tankId" INTEGER NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "theoreticalQuantityAtTime" DECIMAL(12,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tank_level_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tank_level_readings_tankId_measuredAt_idx" ON "tank_level_readings"("tankId", "measuredAt");

-- AddForeignKey
ALTER TABLE "tank_level_readings" ADD CONSTRAINT "tank_level_readings_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
