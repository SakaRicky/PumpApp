import type { Request, Response } from "express"
import {
  pumpCreateSchema,
  pumpUpdateSchema,
  type PumpResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type PumpRow = Awaited<
  ReturnType<typeof prisma.pump.findMany>
>[number]

const toPumpResponse = (row: PumpRow): PumpResponse => {
  const withTank = row as PumpRow & {
    tank?:
      | {
          fuelTypeId: number | null
          fuelType?: { name: string } | null
        }
      | null
  }
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    tankId: row.tankId ?? null,
    fuelTypeId: withTank.tank?.fuelTypeId ?? null,
    fuelTypeName: withTank.tank?.fuelType?.name ?? null,
  }
}

const list = async (_req: Request, res: Response): Promise<void> => {
  const pumps = await prisma.pump.findMany({
    orderBy: { id: "asc" },
    include: {
      tank: {
        include: {
          fuelType: true,
        },
      },
    },
  })
  res.status(200).json(pumps.map(toPumpResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parsed = pumpCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const { name, active, tankId } = parsed.data

  if (tankId !== undefined) {
    const tank = await prisma.tank.findUnique({ where: { id: tankId } })
    if (!tank) {
      throw new AppError("Tank not found", 400, ErrorCode.VALIDATION_ERROR)
    }
  }

  const pump = await prisma.pump.create({
    data: {
      name,
      active: active ?? true,
      ...(tankId !== undefined && { tankId }),
    },
    include: {
      tank: {
        include: {
          fuelType: true,
        },
      },
    },
  })

  res.status(201).json(toPumpResponse(pump))
}

const update = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid pump id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = pumpUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.pump.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Pump not found", 404, ErrorCode.NOT_FOUND)
  }

  if (parsed.data.tankId !== undefined) {
    const tank = await prisma.tank.findUnique({
      where: { id: parsed.data.tankId },
    })
    if (!tank) {
      throw new AppError("Tank not found", 400, ErrorCode.VALIDATION_ERROR)
    }
  }

  const pump = await prisma.pump.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
      ...(parsed.data.tankId !== undefined && { tankId: parsed.data.tankId }),
    },
    include: {
      tank: {
        include: {
          fuelType: true,
        },
      },
    },
  })

  res.status(200).json(toPumpResponse(pump))
}

export { list, create, update, toPumpResponse }

