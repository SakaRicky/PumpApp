import type { Request, Response } from "express"
import {
  tankLevelReadingCreateSchema,
  tankLevelReadingUpdateSchema,
  type TankLevelReadingResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type LevelReadingRow = Awaited<
  ReturnType<typeof prisma.tankLevelReading.findMany>
>[number]

const toLevelReadingResponse = (
  row: LevelReadingRow
): TankLevelReadingResponse => ({
  id: row.id,
  tankId: row.tankId,
  measuredAt: row.measuredAt.toISOString(),
  quantity: Number(row.quantity),
  theoreticalQuantityAtTime:
    row.theoreticalQuantityAtTime !== null
      ? Number(row.theoreticalQuantityAtTime)
      : null,
  createdAt: row.createdAt.toISOString(),
})

const listByTank = async (req: Request, res: Response): Promise<void> => {
  const tankId = Number.parseInt(req.params.tankId, 10)
  if (Number.isNaN(tankId)) {
    throw new AppError("Invalid tank id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const tank = await prisma.tank.findUnique({ where: { id: tankId } })
  if (!tank) {
    throw new AppError("Tank not found", 404, ErrorCode.NOT_FOUND)
  }

  const fromParam = req.query.from
  const toParam = req.query.to
  const limitParam = req.query.limit

  const where: { tankId: number; measuredAt?: { gte?: Date; lte?: Date } } = {
    tankId,
  }
  if (typeof fromParam === "string") {
    const from = new Date(fromParam)
    if (!Number.isNaN(from.getTime())) {
      where.measuredAt = { ...where.measuredAt, gte: from }
    }
  }
  if (typeof toParam === "string") {
    const to = new Date(toParam)
    if (!Number.isNaN(to.getTime())) {
      where.measuredAt = { ...where.measuredAt, lte: to }
    }
  }

  const limit =
    typeof limitParam === "string"
      ? Math.min(Number.parseInt(limitParam, 10) || 100, 500)
      : undefined

  const rows = await prisma.tankLevelReading.findMany({
    where,
    orderBy: { measuredAt: "desc" },
    take: limit,
  })

  res.status(200).json(rows.map(toLevelReadingResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const tankId = Number.parseInt(req.params.tankId, 10)
  if (Number.isNaN(tankId)) {
    throw new AppError("Invalid tank id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = tankLevelReadingCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const tank = await prisma.tank.findUnique({ where: { id: tankId } })
  if (!tank) {
    throw new AppError("Tank not found", 404, ErrorCode.NOT_FOUND)
  }

  const quantity = parsed.data.quantity
  const measuredAt = parsed.data.measuredAt
    ? new Date(parsed.data.measuredAt)
    : new Date()
  if (Number.isNaN(measuredAt.getTime())) {
    throw new AppError(
      "Invalid measuredAt date",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const theoreticalAtTime =
    tank.theoreticalQuantity !== null ? Number(tank.theoreticalQuantity) : null

  const [reading] = await prisma.$transaction([
    prisma.tankLevelReading.create({
      data: {
        tankId,
        quantity,
        measuredAt,
        theoreticalQuantityAtTime: theoreticalAtTime,
      },
    }),
    prisma.tank.update({
      where: { id: tankId },
      data: {
        actualQuantity: quantity,
        actualQuantityRecordedAt: measuredAt,
      },
    }),
  ])

  res.status(201).json(toLevelReadingResponse(reading))
}

const update = async (req: Request, res: Response): Promise<void> => {
  const tankId = Number.parseInt(req.params.tankId, 10)
  const readingId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(tankId) || Number.isNaN(readingId)) {
    throw new AppError(
      "Invalid tank or reading id",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const parsed = tankLevelReadingUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }
  if (
    parsed.data.quantity === undefined &&
    parsed.data.measuredAt === undefined
  ) {
    throw new AppError(
      "At least one of quantity or measuredAt is required",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const existing = await prisma.tankLevelReading.findFirst({
    where: { id: readingId, tankId },
  })
  if (!existing) {
    throw new AppError("Level reading not found", 404, ErrorCode.NOT_FOUND)
  }

  const quantity =
    parsed.data.quantity !== undefined
      ? parsed.data.quantity
      : Number(existing.quantity)
  const measuredAt =
    parsed.data.measuredAt !== undefined
      ? new Date(parsed.data.measuredAt)
      : existing.measuredAt
  if (Number.isNaN(measuredAt.getTime())) {
    throw new AppError(
      "Invalid measuredAt date",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const reading = await prisma.$transaction(async (tx) => {
    const updated = await tx.tankLevelReading.update({
      where: { id: readingId },
      data: {
        quantity,
        measuredAt,
      },
    })
    const latest = await tx.tankLevelReading.findFirst({
      where: { tankId },
      orderBy: [{ measuredAt: "desc" }, { id: "desc" }],
    })
    if (latest && latest.id === readingId) {
      await tx.tank.update({
        where: { id: tankId },
        data: {
          actualQuantity: quantity,
          actualQuantityRecordedAt: measuredAt,
        },
      })
    }
    return updated
  })

  res.status(200).json(toLevelReadingResponse(reading))
}

export { listByTank, create, update, toLevelReadingResponse }
