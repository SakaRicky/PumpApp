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
>[number] & {
  worker?: { id: number; name: string } | null
}

const toPumpReadingResponse = (row: PumpReadingRow): PumpReadingResponse => ({
  id: row.id,
  pumpId: row.pumpId,
  shiftId: row.shiftId,
  openingReading: Number(row.openingReading),
  closingReading: Number(row.closingReading),
  workerId: row.workerId ?? null,
  workerName: row.worker?.name ?? null,
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
    include: {
      worker: { select: { id: true, name: true } },
    },
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
    const message = parsed.error.issues[0]?.message ?? "Validation failed"
    throw new AppError(message, 400, ErrorCode.VALIDATION_ERROR, {
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

  const volume = parsed.data.closingReading - parsed.data.openingReading

  const reading = await prisma.$transaction(async (tx) => {
    const created = await tx.pumpReading.create({
      data: {
        shiftId,
        pumpId: parsed.data.pumpId,
        openingReading: parsed.data.openingReading,
        closingReading: parsed.data.closingReading,
        recordedById: req.user?.id ?? 0,
        workerId: assignment.workerId,
      },
      include: {
        worker: { select: { id: true, name: true } },
      },
    })
    if (pump.tankId != null) {
      const tank = await tx.tank.findUnique({
        where: { id: pump.tankId },
      })
      if (tank) {
        const current =
          tank.theoreticalQuantity != null
            ? Number(tank.theoreticalQuantity)
            : 0
        await tx.tank.update({
          where: { id: pump.tankId },
          data: { theoreticalQuantity: current - volume },
        })
      }
    }
    return created
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
    const message = parsed.error.issues[0]?.message ?? "Validation failed"
    throw new AppError(message, 400, ErrorCode.VALIDATION_ERROR, {
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
      "Closing reading must be greater than or equal to the opening reading",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const pump = await prisma.pump.findUnique({
    where: { id: existing.pumpId },
  })
  const oldVolume =
    Number(existing.closingReading) - Number(existing.openingReading)
  const newVolume = Number(closing) - Number(opening)
  const theoreticalDelta = oldVolume - newVolume

  const reading = await prisma.$transaction(async (tx) => {
    if (pump?.tankId != null && theoreticalDelta !== 0) {
      const tank = await tx.tank.findUnique({
        where: { id: pump.tankId },
      })
      if (tank) {
        const current =
          tank.theoreticalQuantity != null
            ? Number(tank.theoreticalQuantity)
            : 0
        await tx.tank.update({
          where: { id: pump.tankId },
          data: { theoreticalQuantity: current + theoreticalDelta },
        })
      }
    }
    return tx.pumpReading.update({
      where: { id },
      data: {
        openingReading: opening,
        closingReading: closing,
      },
      include: {
        worker: { select: { id: true, name: true } },
      },
    })
  })

  res.status(200).json(toPumpReadingResponse(reading))
}

export { listByShift, createForShift, updateReading, toPumpReadingResponse }
