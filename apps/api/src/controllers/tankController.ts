import type { Request, Response } from "express"
import {
  tankCreateSchema,
  tankUpdateSchema,
  type TankResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type TankRow = Awaited<ReturnType<typeof prisma.tank.findMany>>[number]

const toTankResponse = (
  row: TankRow & { fuelType?: { name: string } | null }
): TankResponse => ({
  id: row.id,
  fuelTypeId: row.fuelTypeId,
  name: row.name,
  capacity: row.capacity !== null ? Number(row.capacity) : null,
  theoreticalQuantity:
    row.theoreticalQuantity !== null ? Number(row.theoreticalQuantity) : null,
  actualQuantity:
    row.actualQuantity !== null ? Number(row.actualQuantity) : null,
  actualQuantityRecordedAt: row.actualQuantityRecordedAt
    ? row.actualQuantityRecordedAt.toISOString()
    : null,
  active: row.active,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  ...(row.fuelType && { fuelTypeName: row.fuelType.name }),
})

const list = async (req: Request, res: Response): Promise<void> => {
  const fuelTypeIdParam = req.query.fuelTypeId

  const where: NonNullable<
    Parameters<typeof prisma.tank.findMany>[0]
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

  const rows = await prisma.tank.findMany({
    where,
    orderBy: { id: "asc" },
    include: { fuelType: true },
  })

  res.status(200).json(rows.map((row) => toTankResponse(row)))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parsed = tankCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const { fuelTypeId, name, capacity, active } = parsed.data

  const fuelType = await prisma.fuelType.findUnique({
    where: { id: fuelTypeId },
  })
  if (!fuelType) {
    throw new AppError("Fuel type not found", 400, ErrorCode.VALIDATION_ERROR)
  }

  const row = await prisma.tank.create({
    data: {
      fuelTypeId,
      name,
      ...(capacity !== undefined && { capacity }),
      active: active ?? true,
    },
    include: { fuelType: true },
  })

  res.status(201).json(toTankResponse(row))
}

const update = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid tank id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = tankUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.tank.findUnique({
    where: { id },
    include: { fuelType: true },
  })
  if (!existing) {
    throw new AppError("Tank not found", 404, ErrorCode.NOT_FOUND)
  }

  if (parsed.data.fuelTypeId !== undefined) {
    const fuelType = await prisma.fuelType.findUnique({
      where: { id: parsed.data.fuelTypeId },
    })
    if (!fuelType) {
      throw new AppError("Fuel type not found", 400, ErrorCode.VALIDATION_ERROR)
    }
  }

  const row = await prisma.tank.update({
    where: { id },
    data: {
      ...(parsed.data.fuelTypeId !== undefined && {
        fuelTypeId: parsed.data.fuelTypeId,
      }),
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.capacity !== undefined && {
        capacity: parsed.data.capacity,
      }),
      ...(parsed.data.actualQuantity !== undefined && {
        actualQuantity: parsed.data.actualQuantity,
        actualQuantityRecordedAt: new Date(),
      }),
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
    },
    include: { fuelType: true },
  })

  res.status(200).json(toTankResponse(row))
}

export { list, create, update, toTankResponse }
