import type { Request, Response } from "express"
import {
  shortageSettlementCreateSchema,
  type ShortageSettlementResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"
import { recordEvent } from "../services/events.js"
import {
  getWorkerShortageBalances,
  getWorkerShortageLedger,
} from "../services/shortages.js"

const listBalances = async (req: Request, res: Response): Promise<void> => {
  const workerIdParam = req.query.workerId
  if (typeof workerIdParam === "string") {
    const workerId = Number.parseInt(workerIdParam, 10)
    if (Number.isNaN(workerId)) {
      throw new AppError("Invalid workerId", 400, ErrorCode.VALIDATION_ERROR)
    }
    const ledger = await getWorkerShortageLedger(workerId)
    res.status(200).json(ledger)
    return
  }

  const balances = await getWorkerShortageBalances()
  res.status(200).json(balances)
}

const createSettlement = async (
  req: Request,
  res: Response
): Promise<void> => {
  const parsed = shortageSettlementCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const { workerId, date, amount, notes } = parsed.data

  const worker = await prisma.worker.findUnique({ where: { id: workerId } })
  if (!worker) {
    throw new AppError("Worker not found", 404, ErrorCode.NOT_FOUND)
  }

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const actorId = req.user.id
  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.shortageSettlement.create({
      data: {
        workerId,
        date: new Date(date),
        amount,
        notes: notes ?? null,
        recordedById: actorId,
      },
    })
    await recordEvent(
      {
        type: "SHORTAGE_SETTLED",
        actorUserId: actorId,
        workerId,
        entity: "shortageSettlement",
        entityId: row.id,
        payload: { date, amount },
        notes: notes ?? null,
      },
      tx
    )
    return row
  })

  const response: ShortageSettlementResponse = {
    id: created.id,
    workerId: created.workerId,
    date: created.date.toISOString(),
    amount: created.amount.toNumber(),
    notes: created.notes,
    recordedById: created.recordedById,
    createdAt: created.createdAt.toISOString(),
  }
  res.status(201).json(response)
}

export { listBalances, createSettlement }
