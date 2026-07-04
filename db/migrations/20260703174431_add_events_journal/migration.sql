-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SHIFT_CREATED', 'SHIFT_UPDATED', 'SHIFT_STATUS_CHANGED', 'SHIFT_STOCK_UPSERTED', 'PUMP_READING_RECORDED', 'PUMP_READING_UPDATED', 'CASH_HAND_IN_RECORDED', 'CASH_HAND_IN_UPDATED', 'CASH_HAND_IN_DELETED', 'RECONCILIATION_CREATED', 'RECONCILIATION_UPDATED', 'FUEL_DELIVERY_RECORDED', 'TANK_LEVEL_READING_RECORDED', 'FUEL_PRICE_SET', 'PURCHASE_PRICE_SET', 'WEEKLY_INVENTORY_CLOSE_RECORDED');

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "type" "EventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" INTEGER,
    "workerId" INTEGER,
    "shiftId" INTEGER,
    "entity" TEXT,
    "entityId" INTEGER,
    "payload" JSONB,
    "correctsEventId" INTEGER,
    "notes" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_type_occurredAt_idx" ON "events"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "events_shiftId_idx" ON "events"("shiftId");

-- CreateIndex
CREATE INDEX "events_occurredAt_idx" ON "events"("occurredAt");

-- Events are an append-only journal: block UPDATE and DELETE at the database level.
CREATE OR REPLACE FUNCTION prevent_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'events are append-only; corrections must be new events referencing corrects_event_id';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_append_only
BEFORE UPDATE OR DELETE ON "events"
FOR EACH ROW EXECUTE FUNCTION prevent_event_mutation();
