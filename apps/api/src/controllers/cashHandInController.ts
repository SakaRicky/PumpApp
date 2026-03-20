import type { Request, Response } from "express"
import {
  cashHandInCreateSchema,
  type CashHandInResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type CashHandInRow = Awaited<
  ReturnType<typeof prisma.cashHandIn.findMany>
>[number]

const toResponse = (row: CashHandInRow): CashHandInResponse => ({
  id: row.id,
  shiftId: row.shiftId,
  workerId: row.workerId,
  amount: row.amount.toNumber(),
  recordedById: row.recordedById,
  recordedAt: row.recordedAt.toISOString(),
})

const listByShift = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  const rows = await prisma.cashHandIn.findMany({
    where: { shiftId },
    orderBy: { recordedAt: "asc" },
  })

  res.status(200).json(rows.map(toResponse))
}

const createForShift = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = cashHandInCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  const worker = await prisma.worker.findUnique({
    where: { id: parsed.data.workerId },
  })
  if (!worker) {
    throw new AppError("Worker not found", 404, ErrorCode.NOT_FOUND)
  }

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const created = await prisma.cashHandIn.create({
    data: {
      shiftId,
      workerId: parsed.data.workerId,
      amount: parsed.data.amount,
      recordedById: req.user.id,
    },
  })

  res.status(201).json(toResponse(created))
}

export { listByShift, createForShift, toResponse }
