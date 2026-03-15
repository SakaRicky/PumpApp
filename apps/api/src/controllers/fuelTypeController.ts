import type { Request, Response } from "express"
import {
  fuelTypeCreateSchema,
  fuelTypeUpdateSchema,
  type FuelTypeResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type FuelTypeRow = Awaited<ReturnType<typeof prisma.fuelType.findMany>>[number]

const toFuelTypeResponse = (row: FuelTypeRow): FuelTypeResponse => ({
  id: row.id,
  name: row.name,
  active: row.active,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const list = async (_req: Request, res: Response): Promise<void> => {
  const rows = await prisma.fuelType.findMany({
    orderBy: { id: "asc" },
  })
  res.status(200).json(rows.map(toFuelTypeResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parsed = fuelTypeCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const { name, active } = parsed.data

  const row = await prisma.fuelType.create({
    data: {
      name,
      active: active ?? true,
    },
  })

  res.status(201).json(toFuelTypeResponse(row))
}

const update = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid fuel type id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = fuelTypeUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.fuelType.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Fuel type not found", 404, ErrorCode.NOT_FOUND)
  }

  const row = await prisma.fuelType.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
    },
  })

  res.status(200).json(toFuelTypeResponse(row))
}

export { list, create, update, toFuelTypeResponse }
