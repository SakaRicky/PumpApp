-- Backfill any legacy NULL worker on cash hand-ins (requires at least one worker)
UPDATE "cash_hand_ins"
SET "workerId" = (SELECT id FROM "workers" ORDER BY id LIMIT 1)
WHERE "workerId" IS NULL;

ALTER TABLE "cash_hand_ins" DROP CONSTRAINT "cash_hand_ins_workerId_fkey";

ALTER TABLE "cash_hand_ins" ALTER COLUMN "workerId" SET NOT NULL;

ALTER TABLE "cash_hand_ins" ADD CONSTRAINT "cash_hand_ins_workerId_fkey"
  FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_reconciliation_summaries" ADD COLUMN "fuelSalesOverrideReason" TEXT;
ALTER TABLE "shift_reconciliation_summaries" ADD COLUMN "cashHandedTotalOverrideReason" TEXT;
