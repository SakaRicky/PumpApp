import type { Prisma } from "../../node_modules/.prisma/client/index.js"
import type { EventType } from "@pumpapp/shared"
import { prisma } from "../db.js"

export type RecordEventInput = {
  type: EventType
  actorUserId?: number | null
  workerId?: number | null
  shiftId?: number | null
  entity?: string | null
  entityId?: number | null
  payload?: Prisma.InputJsonValue
  correctsEventId?: number | null
  notes?: string | null
}

/** Minimal client surface so both `prisma` and a transaction client work. */
type EventWriter = {
  event: { create: (args: { data: Prisma.EventUncheckedCreateInput }) => Promise<unknown> }
}

export const buildEventData = (
  input: RecordEventInput
): Prisma.EventUncheckedCreateInput => ({
  type: input.type,
  actorUserId: input.actorUserId ?? null,
  workerId: input.workerId ?? null,
  shiftId: input.shiftId ?? null,
  entity: input.entity ?? null,
  entityId: input.entityId ?? null,
  ...(input.payload !== undefined && { payload: input.payload }),
  correctsEventId: input.correctsEventId ?? null,
  notes: input.notes ?? null,
})

/**
 * Append one row to the immutable events journal. Call inside the same
 * transaction as the state change it records by passing the tx client.
 */
export const recordEvent = async (
  input: RecordEventInput,
  client: EventWriter = prisma
): Promise<void> => {
  await client.event.create({ data: buildEventData(input) })
}
