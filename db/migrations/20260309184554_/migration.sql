/*
  Warnings:

  - You are about to drop the column `pumpId` on the `fuel_price_history` table. All the data in the column will be lost.
  - Added the required column `fuelTypeId` to the `fuel_price_history` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "fuel_price_history" DROP CONSTRAINT "fuel_price_history_pumpId_fkey";

-- DropIndex
DROP INDEX "fuel_price_history_pumpId_effectiveFrom_effectiveTo_idx";

-- AlterTable
ALTER TABLE "fuel_price_history" DROP COLUMN "pumpId",
ADD COLUMN     "fuelTypeId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "fuel_price_history_fuelTypeId_effectiveFrom_effectiveTo_idx" ON "fuel_price_history"("fuelTypeId", "effectiveFrom", "effectiveTo");

-- AddForeignKey
ALTER TABLE "fuel_price_history" ADD CONSTRAINT "fuel_price_history_fuelTypeId_fkey" FOREIGN KEY ("fuelTypeId") REFERENCES "fuel_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
