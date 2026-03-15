import type { Request, Response } from "express"
import {
  fuelDeliveryCreateSchema,
  type FuelDeliveryResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type DeliveryRow = Awaited<
  ReturnType<typeof prisma.fuelDelivery.findMany>
>[number] & {
  tank?: { name: string; fuelType?: { name: string } | null } | null
}

const toDeliveryResponse = (row: DeliveryRow): FuelDeliveryResponse => ({
  id: row.id,
  tankId: row.tankId,
  quantity: Number(row.quantity),
  deliveredAt: row.deliveredAt.toISOString(),
  notes: row.notes,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  ...(row.tank && {
    tankName: row.tank.name,
    fuelTypeName: row.tank.fuelType?.name ?? undefined,
  }),
})

const list = async (req: Request, res: Response): Promise<void> => {
  const tankIdParam = req.query.tankId
  const where: { tankId?: number } = {}

  if (tankIdParam !== undefined) {
    const tid = Number.parseInt(String(tankIdParam), 10)
    if (Number.isNaN(tid)) {
      throw new AppError(
        "Invalid tankId",
        400,
        ErrorCode.VALIDATION_ERROR,
        undefined
      )
    }
    where.tankId = tid
  }

  const rows = await prisma.fuelDelivery.findMany({
    where,
    orderBy: { deliveredAt: "desc" },
    include: { tank: { include: { fuelType: true } } },
  })

  res.status(200).json(rows.map((row) => toDeliveryResponse(row)))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const tankId = Number.parseInt(req.params.tankId, 10)
  if (Number.isNaN(tankId)) {
    throw new AppError("Invalid tank id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = fuelDeliveryCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const tank = await prisma.tank.findUnique({
    where: { id: tankId },
    include: { fuelType: true },
  })
  if (!tank) {
    throw new AppError("Tank not found", 404, ErrorCode.NOT_FOUND)
  }

  const { quantity, deliveredAt, notes } = parsed.data
  const deliveredAtDate = deliveredAt ? new Date(deliveredAt) : new Date()

  const [delivery] = await prisma.$transaction([
    prisma.fuelDelivery.create({
      data: {
        tankId,
        quantity,
        deliveredAt: deliveredAtDate,
        notes: notes ?? null,
      },
    }),
    prisma.tank.update({
      where: { id: tankId },
      data: {
        theoreticalQuantity:
          (tank.theoreticalQuantity !== null
            ? Number(tank.theoreticalQuantity)
            : 0) + quantity,
      },
    }),
  ])

  const row = await prisma.fuelDelivery.findUnique({
    where: { id: delivery.id },
    include: { tank: { include: { fuelType: true } } },
  })
  if (!row) {
    throw new AppError("Delivery not found after create", 500)
  }

  res.status(201).json(toDeliveryResponse(row))
}

export { list, create, toDeliveryResponse }
