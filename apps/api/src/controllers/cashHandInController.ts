import type { Request, Response } from "express"
import {
  cashHandInCreateSchema,
  cashHandInVariancePatchSchema,
  type CashHandInResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

const ensureWorkerOnShift = async (
  shiftId: number,
  workerId: number
): Promise<void> => {
  const onShift = await prisma.shiftWorker.findUnique({
    where: {
      shiftId_workerId: { shiftId, workerId },
    },
  })
  if (!onShift) {
    throw new AppError(
      "Worker must be assigned to this shift before recording a cash hand-in",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }
}

type CashHandInRow = Awaited<
  ReturnType<typeof prisma.cashHandIn.findMany>
>[number]

const toResponse = (row: CashHandInRow): CashHandInResponse => ({
  id: row.id,
  shiftId: row.shiftId,
  workerId: row.workerId,
  amount: row.amount.toNumber(),
  varianceAmount: row.varianceAmount?.toNumber() ?? null,
  varianceNote: row.varianceNote ?? null,
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

  await ensureWorkerOnShift(shiftId, parsed.data.workerId)

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const varianceAmount =
    parsed.data.varianceAmount !== undefined ? parsed.data.varianceAmount : null
  const varianceNote =
    parsed.data.varianceNote === undefined || parsed.data.varianceNote === null
      ? null
      : parsed.data.varianceNote.trim() === ""
        ? null
        : parsed.data.varianceNote.trim()

  const created = await prisma.cashHandIn.create({
    data: {
      shiftId,
      workerId: parsed.data.workerId,
      amount: parsed.data.amount,
      varianceAmount,
      varianceNote,
      recordedById: req.user.id,
    },
  })

  res.status(201).json(toResponse(created))
}

const patchVarianceForShift = async (
  req: Request,
  res: Response
): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  const handInId = Number.parseInt(req.params.handInId, 10)
  if (Number.isNaN(shiftId) || Number.isNaN(handInId)) {
    throw new AppError("Invalid id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = cashHandInVariancePatchSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  const existing = await prisma.cashHandIn.findFirst({
    where: { id: handInId, shiftId },
  })
  if (!existing) {
    throw new AppError("Cash hand-in not found", 404, ErrorCode.NOT_FOUND)
  }

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const data: {
    varianceAmount?: number | null
    varianceNote?: string | null
  } = {}
  if (parsed.data.varianceAmount !== undefined) {
    data.varianceAmount = parsed.data.varianceAmount
  }
  if (parsed.data.varianceNote !== undefined) {
    data.varianceNote =
      parsed.data.varianceNote === null
        ? null
        : parsed.data.varianceNote.trim() === ""
          ? null
          : parsed.data.varianceNote.trim()
  }

  const updated = await prisma.cashHandIn.update({
    where: { id: handInId },
    data,
  })

  res.status(200).json(toResponse(updated))
}

export { listByShift, createForShift, patchVarianceForShift, toResponse }
