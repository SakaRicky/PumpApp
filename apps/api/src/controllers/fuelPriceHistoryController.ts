import type { Request, Response } from "express"
import {
  fuelPriceCreateSchema,
  fuelPriceUpdateSchema,
  type FuelPriceResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type FuelPriceRow = Awaited<
  ReturnType<typeof prisma.fuelPriceHistory.findMany>
>[number]

const toFuelPriceResponse = (row: FuelPriceRow): FuelPriceResponse => ({
  id: row.id,
  fuelTypeId: row.fuelTypeId,
  pricePerUnit: Number(row.pricePerUnit),
  purchasePricePerUnit:
    row.purchasePricePerUnit !== null
      ? Number(row.purchasePricePerUnit)
      : null,
  effectiveFrom: row.effectiveFrom.toISOString(),
  effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString() : null,
})

const list = async (req: Request, res: Response): Promise<void> => {
  const fuelTypeIdParam = req.query.fuelTypeId
  const fromParam = req.query.from as string | undefined
  const toParam = req.query.to as string | undefined

  const where: NonNullable<
    Parameters<typeof prisma.fuelPriceHistory.findMany>[0]
  >["where"] = {}

  if (fuelTypeIdParam) {
    const fid = Number.parseInt(String(fuelTypeIdParam), 10)
    if (Number.isNaN(fid)) {
      throw new AppError(
        "Invalid fuelTypeId",
        400,
        ErrorCode.VALIDATION_ERROR,
        undefined
      )
    }
    where.fuelTypeId = fid
  }

  if (fromParam || toParam) {
    where.effectiveFrom = {}
    if (fromParam) {
      where.effectiveFrom.gte = new Date(fromParam)
    }
    if (toParam) {
      where.effectiveFrom.lte = new Date(toParam)
    }
  }

  const rows = await prisma.fuelPriceHistory.findMany({
    where,
    orderBy: [{ fuelTypeId: "asc" }, { effectiveFrom: "asc" }],
  })
  res.status(200).json(rows.map(toFuelPriceResponse))
}

const ensureNoOverlap = async (
  fuelTypeId: number,
  effectiveFrom: Date,
  effectiveTo: Date | null,
  excludeId?: number
): Promise<void> => {
  const existing = await prisma.fuelPriceHistory.findMany({
    where: {
      fuelTypeId,
      ...(excludeId && { NOT: { id: excludeId } }),
    },
  })

  const newStart = effectiveFrom.getTime()
  const newEnd = effectiveTo ? effectiveTo.getTime() : Number.POSITIVE_INFINITY

  for (const row of existing) {
    const rowStart = row.effectiveFrom.getTime()
    const rowEnd = row.effectiveTo
      ? row.effectiveTo.getTime()
      : Number.POSITIVE_INFINITY
    const overlaps = newStart <= rowEnd && rowStart <= newEnd
    if (overlaps) {
      throw new AppError(
        "Fuel price range overlaps existing range for fuel",
        400,
        ErrorCode.VALIDATION_ERROR
      )
    }
  }
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parsed = fuelPriceCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const {
    fuelTypeId,
    pricePerUnit,
    purchasePricePerUnit,
    effectiveFrom,
    effectiveTo,
  } = parsed.data

  const fuelType = await prisma.fuelType.findUnique({ where: { id: fuelTypeId } })
  if (!fuelType) {
    throw new AppError("Fuel type not found", 400, ErrorCode.VALIDATION_ERROR)
  }

  const fromDate = new Date(effectiveFrom)
  const toDate = effectiveTo ? new Date(effectiveTo) : null

  await ensureNoOverlap(fuelTypeId, fromDate, toDate)

  const row = await prisma.fuelPriceHistory.create({
    data: {
      fuelTypeId,
      pricePerUnit,
      purchasePricePerUnit:
        purchasePricePerUnit !== undefined ? purchasePricePerUnit : null,
      effectiveFrom: fromDate,
      effectiveTo: toDate,
    },
  })

  res.status(201).json(toFuelPriceResponse(row))
}

const update = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid fuel price id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = fuelPriceUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.fuelPriceHistory.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Fuel price not found", 404, ErrorCode.NOT_FOUND)
  }

  const fromDate =
    parsed.data.effectiveFrom !== undefined
      ? new Date(parsed.data.effectiveFrom)
      : existing.effectiveFrom
  const toDate =
    parsed.data.effectiveTo !== undefined
      ? parsed.data.effectiveTo === null
        ? null
        : new Date(parsed.data.effectiveTo)
      : existing.effectiveTo

  await ensureNoOverlap(existing.fuelTypeId, fromDate, toDate, id)

  const row = await prisma.fuelPriceHistory.update({
    where: { id },
    data: {
      ...(parsed.data.pricePerUnit !== undefined && {
        pricePerUnit: parsed.data.pricePerUnit,
      }),
      ...(parsed.data.purchasePricePerUnit !== undefined && {
        purchasePricePerUnit: parsed.data.purchasePricePerUnit,
      }),
      effectiveFrom: fromDate,
      effectiveTo: toDate,
    },
  })

  res.status(200).json(toFuelPriceResponse(row))
}

const getPriceForShift = async (
  fuelTypeId: number,
  date: Date
): Promise<FuelPriceResponse> => {
  const rows = await prisma.fuelPriceHistory.findMany({
    where: { fuelTypeId },
  })

  const time = date.getTime()
  const matches = rows.filter((row) => {
    const start = row.effectiveFrom.getTime()
    const end = row.effectiveTo
      ? row.effectiveTo.getTime()
      : Number.POSITIVE_INFINITY
    return start <= time && time <= end
  })

  if (matches.length !== 1) {
    throw new AppError(
      "No unique fuel price for this fuel type and date",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  return toFuelPriceResponse(matches[0]!)
}

export { list, create, update, getPriceForShift }

