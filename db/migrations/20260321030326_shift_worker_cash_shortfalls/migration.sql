/*
  Warnings:

  - You are about to drop the column `dailyCashShortfallAmount` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `dailyCashShortfallNote` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `dailyCashShortfallRecordedAt` on the `shifts` table. All the data in the column will be lost.
  - You are about to drop the column `dailyCashShortfallRecordedById` on the `shifts` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_dailyCashShortfallRecordedById_fkey";

-- AlterTable
ALTER TABLE "shifts" DROP COLUMN "dailyCashShortfallAmount",
DROP COLUMN "dailyCashShortfallNote",
DROP COLUMN "dailyCashShortfallRecordedAt",
DROP COLUMN "dailyCashShortfallRecordedById";

-- CreateTable
CREATE TABLE "shift_worker_cash_shortfalls" (
    "id" SERIAL NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "workerId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "recordedById" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_worker_cash_shortfalls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shift_worker_cash_shortfalls_shiftId_idx" ON "shift_worker_cash_shortfalls"("shiftId");

-- CreateIndex
CREATE INDEX "shift_worker_cash_shortfalls_workerId_idx" ON "shift_worker_cash_shortfalls"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_worker_cash_shortfalls_shiftId_workerId_key" ON "shift_worker_cash_shortfalls"("shiftId", "workerId");

-- AddForeignKey
ALTER TABLE "shift_worker_cash_shortfalls" ADD CONSTRAINT "shift_worker_cash_shortfalls_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_worker_cash_shortfalls" ADD CONSTRAINT "shift_worker_cash_shortfalls_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_worker_cash_shortfalls" ADD CONSTRAINT "shift_worker_cash_shortfalls_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
