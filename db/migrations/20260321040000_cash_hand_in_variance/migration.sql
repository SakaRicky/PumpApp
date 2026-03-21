-- AlterTable
ALTER TABLE "cash_hand_ins" ADD COLUMN "varianceAmount" DECIMAL(10,2),
ADD COLUMN "varianceNote" TEXT;

-- Move legacy per-shift worker shortfalls onto the latest hand-in for that worker (same shift)
UPDATE "cash_hand_ins" AS chi
SET
  "varianceAmount" = s.amount,
  "varianceNote" = s.note
FROM "shift_worker_cash_shortfalls" AS s
WHERE chi."shiftId" = s."shiftId"
  AND chi."workerId" = s."workerId"
  AND chi.id = (
    SELECT c2.id
    FROM "cash_hand_ins" AS c2
    WHERE c2."shiftId" = s."shiftId" AND c2."workerId" = s."workerId"
    ORDER BY c2."recordedAt" DESC
    LIMIT 1
  );

-- Shortfall rows with no hand-in yet: create a zero-amount hand-in that carries variance only
INSERT INTO "cash_hand_ins" ("shiftId", "workerId", amount, "recordedById", "recordedAt", "varianceAmount", "varianceNote")
SELECT s."shiftId", s."workerId", 0, s."recordedById", s."recordedAt", s.amount, s.note
FROM "shift_worker_cash_shortfalls" AS s
WHERE NOT EXISTS (
  SELECT 1 FROM "cash_hand_ins" c
  WHERE c."shiftId" = s."shiftId" AND c."workerId" = s."workerId"
);

-- DropTable
DROP TABLE "shift_worker_cash_shortfalls";
