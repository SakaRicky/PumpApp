import type { Request, Response } from "express"
import {
  eventListQuerySchema,
  type EventListResponse,
  type EventResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type EventRow = Awaited<ReturnType<typeof prisma.event.findMany>>[number]

const toEventResponse = (row: EventRow): EventResponse => ({
  id: row.id,
  type: row.type,
  occurredAt: row.occurredAt.toISOString(),
  actorUserId: row.actorUserId,
  workerId: row.workerId,
  shiftId: row.shiftId,
  entity: row.entity,
  entityId: row.entityId,
  payload: row.payload ?? null,
  correctsEventId: row.correctsEventId,
  notes: row.notes,
})

const list = async (req: Request, res: Response): Promise<void> => {
  const parsed = eventListQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const { type, shiftId, workerId, from, to, limit, offset } = parsed.data

  const where = {
    ...(type && { type }),
    ...(shiftId && { shiftId }),
    ...(workerId && { workerId }),
    ...((from || to) && {
      occurredAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  }

  const [rows, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.event.count({ where }),
  ])

  const response: EventListResponse = {
    items: rows.map(toEventResponse),
    total,
  }
  res.status(200).json(response)
}

export { list, toEventResponse }
