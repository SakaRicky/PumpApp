-- AlterTable
ALTER TABLE "pump_readings" ADD COLUMN     "workerId" INTEGER;

-- CreateTable
CREATE TABLE "shift_pump_assignments" (
    "shiftId" INTEGER NOT NULL,
    "pumpId" INTEGER NOT NULL,
    "workerId" INTEGER NOT NULL,

    CONSTRAINT "shift_pump_assignments_pkey" PRIMARY KEY ("shiftId","pumpId")
);

-- CreateIndex
CREATE INDEX "shift_pump_assignments_workerId_idx" ON "shift_pump_assignments"("workerId");

-- CreateIndex
CREATE INDEX "shift_pump_assignments_shiftId_pumpId_idx" ON "shift_pump_assignments"("shiftId", "pumpId");

-- AddForeignKey
ALTER TABLE "pump_readings" ADD CONSTRAINT "pump_readings_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_pump_assignments" ADD CONSTRAINT "shift_pump_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_pump_assignments" ADD CONSTRAINT "shift_pump_assignments_pumpId_fkey" FOREIGN KEY ("pumpId") REFERENCES "pumps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_pump_assignments" ADD CONSTRAINT "shift_pump_assignments_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
