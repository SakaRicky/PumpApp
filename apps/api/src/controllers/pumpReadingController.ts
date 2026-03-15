import type { Request, Response } from "express"
import {
  pumpReadingCreateSchema,
  pumpReadingUpdateSchema,
  type PumpReadingResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type PumpReadingRow = Awaited<
  ReturnType<typeof prisma.pumpReading.findMany>
>[number]

const toPumpReadingResponse = (row: PumpReadingRow): PumpReadingResponse => ({
  id: row.id,
  pumpId: row.pumpId,
  shiftId: row.shiftId,
  openingReading: Number(row.openingReading),
  closingReading: Number(row.closingReading),
  recordedById: row.recordedById,
  recordedAt: row.recordedAt.toISOString(),
  volume: Number(row.closingReading) - Number(row.openingReading),
})

const listByShift = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const rows = await prisma.pumpReading.findMany({
    where: { shiftId },
    orderBy: { pumpId: "asc" },
  })

  res.status(200).json(rows.map(toPumpReadingResponse))
}

const createForShift = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = pumpReadingCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  const pump = await prisma.pump.findUnique({
    where: { id: parsed.data.pumpId },
  })
  if (!pump || !pump.active) {
    throw new AppError(
      "Pump not found or inactive",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const existing = await prisma.pumpReading.findFirst({
    where: { shiftId, pumpId: parsed.data.pumpId },
  })
  if (existing) {
    throw new AppError(
      "Reading already exists for this pump and shift",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const assignment = await prisma.shiftPumpAssignment.findUnique({
    where: {
      shiftId_pumpId: {
        shiftId,
        pumpId: parsed.data.pumpId,
      },
    },
  })
  if (!assignment) {
    throw new AppError(
      "No worker assigned to this pump for the shift",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const reading = await prisma.pumpReading.create({
    data: {
      shiftId,
      pumpId: parsed.data.pumpId,
      openingReading: parsed.data.openingReading,
      closingReading: parsed.data.closingReading,
      recordedById: req.user?.id ?? 0,
      workerId: assignment.workerId,
    },
  })

  res.status(201).json(toPumpReadingResponse(reading))
}

const updateReading = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError(
      "Invalid pump reading id",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const parsed = pumpReadingUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.pumpReading.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Pump reading not found", 404, ErrorCode.NOT_FOUND)
  }

  const opening =
    parsed.data.openingReading !== undefined
      ? parsed.data.openingReading
      : existing.openingReading
  const closing =
    parsed.data.closingReading !== undefined
      ? parsed.data.closingReading
      : existing.closingReading

  if (closing < opening) {
    throw new AppError(
      "Closing reading must be >= opening reading",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const reading = await prisma.pumpReading.update({
    where: { id },
    data: {
      openingReading: opening,
      closingReading: closing,
    },
  })

  res.status(200).json(toPumpReadingResponse(reading))
}

export { listByShift, createForShift, updateReading, toPumpReadingResponse }
