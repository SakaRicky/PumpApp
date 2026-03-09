import type { Request, Response } from "express"
import {
  shiftCreateSchema,
  shiftUpdateSchema,
  shiftWorkerAssignSchema,
  shiftStockBulkUpdateSchema,
  Role,
  type ShiftResponse,
  type ShiftStockItemResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type ShiftRow = Awaited<ReturnType<typeof prisma.shift.findMany>>[number]

const toShiftResponse = (row: ShiftRow): ShiftResponse => ({
  id: row.id,
  date: row.date.toISOString(),
  startTime: row.startTime.toISOString(),
  endTime: row.endTime.toISOString(),
  status: row.status,
  notes: row.notes ?? null,
})

const list = async (_req: Request, res: Response): Promise<void> => {
  const shifts = await prisma.shift.findMany({
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  })
  res.status(200).json(shifts.map(toShiftResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parsed = shiftCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const { date, startTime, endTime, status, notes } = parsed.data
  const shift = await prisma.shift.create({
    data: {
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status,
      notes,
    },
  })
  res.status(201).json(toShiftResponse(shift))
}

const isValidStatusTransition = (current: string, next: string): boolean => {
  if (current === next) return true
  switch (current) {
    case "PLANNED":
      return next === "OPEN" || next === "CLOSED"
    case "OPEN":
      return next === "CLOSED"
    case "CLOSED":
      return next === "RECONCILED"
    case "RECONCILED":
      return next === "CLOSED"
    default:
      return false
  }
}

const ensureCanCloseShift = async (shiftId: number): Promise<void> => {
  const shiftWorkers = await prisma.shiftWorker.findMany({
    where: { shiftId },
    include: {
      worker: {
        include: {
          user: true,
        },
      },
    },
  })

  if (shiftWorkers.length === 0) {
    throw new AppError(
      "Shift must have at least one worker before closing",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const hasSaleWorker = shiftWorkers.some(
    (sw) => sw.worker.user?.role === Role.SALE
  )
  const hasPumpWorker = shiftWorkers.some(
    (sw) => sw.worker.user?.role === Role.PUMPIST
  )

  if (hasSaleWorker) {
    const stockCount = await prisma.shiftProductStock.count({
      where: { shiftId },
    })
    if (stockCount === 0) {
      throw new AppError(
        "Cannot close shift without shop stock snapshot",
        400,
        ErrorCode.VALIDATION_ERROR
      )
    }
  }

  if (hasPumpWorker) {
    const pumpReadingCount = await prisma.pumpReading.count({
      where: { shiftId },
    })
    if (pumpReadingCount === 0) {
      throw new AppError(
        "Cannot close shift without pump readings",
        400,
        ErrorCode.VALIDATION_ERROR
      )
    }
  }
}

const update = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = shiftUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.shift.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  if (parsed.data.status && !isValidStatusTransition(existing.status, parsed.data.status)) {
    throw new AppError(
      "Invalid shift status transition",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const nextStatus = parsed.data.status

  // Only apply closure preconditions and inventory updates on first transition to CLOSED
  const shouldCloseAndUpdateInventory =
    nextStatus === "CLOSED" &&
    (existing.status === "PLANNED" || existing.status === "OPEN")

  if (shouldCloseAndUpdateInventory) {
    await ensureCanCloseShift(id)

    const updated = await prisma.$transaction(async (tx) => {
      const stocks = await tx.shiftProductStock.findMany({
        where: { shiftId: id },
      })

      for (const stock of stocks) {
        // soldQty = opening - closing; negative values will effectively increase stock
        const soldQty = stock.openingQty.sub(stock.closingQty)
        if (soldQty.isZero()) continue

        await tx.product.update({
          where: { id: stock.productId },
          data: {
            currentStock: {
              decrement: soldQty,
            },
          },
        })
      }

      const updatedShift = await tx.shift.update({
        where: { id },
        data: {
          ...(parsed.data.date && { date: new Date(parsed.data.date) }),
          ...(parsed.data.startTime && {
            startTime: new Date(parsed.data.startTime),
          }),
          ...(parsed.data.endTime && {
            endTime: new Date(parsed.data.endTime),
          }),
          status: "CLOSED",
          ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        },
      })

      return updatedShift
    })

    res.status(200).json(toShiftResponse(updated))
    return
  }

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      ...(parsed.data.date && { date: new Date(parsed.data.date) }),
      ...(parsed.data.startTime && { startTime: new Date(parsed.data.startTime) }),
      ...(parsed.data.endTime && { endTime: new Date(parsed.data.endTime) }),
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
    },
  })

  res.status(200).json(toShiftResponse(updated))
}

const listWorkers = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      workers: {
        include: {
          worker: true,
        },
      },
    },
  })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  const workers = shift.workers.map((sw) => ({
    id: sw.worker.id,
    name: sw.worker.name,
    designation: sw.worker.designation ?? null,
    active: sw.worker.active,
  }))

  res.status(200).json(workers)
}

const assignWorkers = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = shiftWorkerAssignSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const shift = await prisma.shift.findUnique({ where: { id } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  const workerIds: number[] = []
  if (parsed.data.workerId !== undefined) workerIds.push(parsed.data.workerId)
  if (parsed.data.workerIds) workerIds.push(...parsed.data.workerIds)

  const uniqueIds = Array.from(new Set(workerIds))

  const workers = await prisma.worker.findMany({
    where: { id: { in: uniqueIds } },
  })
  const activeWorkerIds = new Set(
    workers.filter((w) => w.active).map((w) => w.id)
  )

  const inactiveRequested = uniqueIds.filter((id) => !activeWorkerIds.has(id))
  if (inactiveRequested.length > 0) {
    throw new AppError(
      "Cannot assign inactive workers",
      400,
      ErrorCode.VALIDATION_ERROR,
      { workerIds: inactiveRequested }
    )
  }

  await prisma.$transaction(
    uniqueIds.map((workerId) =>
      prisma.shiftWorker.upsert({
        where: { shiftId_workerId: { shiftId: id, workerId } },
        create: { shiftId: id, workerId },
        update: {},
      })
    )
  )

  res.status(204).send()
}

const unassignWorker = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  const workerId = Number.parseInt(req.params.workerId, 10)
  if (Number.isNaN(shiftId) || Number.isNaN(workerId)) {
    throw new AppError(
      "Invalid shift or worker id",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  await prisma.shiftWorker.deleteMany({
    where: { shiftId, workerId },
  })

  res.status(204).send()
}

const listStock = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const rows = await prisma.shiftProductStock.findMany({
    where: { shiftId },
    include: {
      product: {
        include: { category: true },
      },
    },
    orderBy: {
      product: { name: "asc" },
    },
  })

  const response: ShiftStockItemResponse[] = rows.map((row) => ({
    productId: row.productId,
    openingQty: Number(row.openingQty),
    closingQty: Number(row.closingQty),
    soldQty: Number(row.openingQty) - Number(row.closingQty),
    product: {
      id: row.product.id,
      name: row.product.name,
      categoryId: row.product.categoryId,
      categoryName: row.product.category?.name,
    },
  }))

  res.status(200).json(response)
}

const upsertStock = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = shiftStockBulkUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  const items = parsed.data
  const productIds = Array.from(
    new Set<number>(items.map((i) => i.productId as number))
  )

  const products = await prisma.product.findMany({
    where: { id: { in: productIds as number[] } },
  })
  const existingProductIds = new Set(products.map((p) => p.id))
  const missing = productIds.filter((id: number) => !existingProductIds.has(id))
  if (missing.length > 0) {
    throw new AppError(
      "Some products do not exist",
      400,
      ErrorCode.VALIDATION_ERROR,
      { productIds: missing }
    )
  }

  await prisma.$transaction(
    items.map((item: { productId: number; openingQty?: number; closingQty: number }) =>
      prisma.shiftProductStock.upsert({
        where: {
          shiftId_productId: { shiftId, productId: item.productId },
        },
        create: {
          shiftId,
          productId: item.productId,
          openingQty:
            item.openingQty !== undefined ? item.openingQty : 0,
          closingQty: item.closingQty,
        },
        update: {
          ...(item.openingQty !== undefined && {
            openingQty: item.openingQty,
          }),
          closingQty: item.closingQty,
        },
      })
    )
  )

  res.status(204).send()
}

const listPumpAssignments = async (
  req: Request,
  res: Response
): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  const [pumps, assignments] = await Promise.all([
    prisma.pump.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
    }),
    prisma.shiftPumpAssignment.findMany({
      where: { shiftId },
      include: {
        worker: true,
      },
    }),
  ])

  const assignmentByPumpId = new Map(
    assignments.map((a) => [a.pumpId, a])
  )

  const result = pumps.map((pump) => {
    const assignment = assignmentByPumpId.get(pump.id)
    return {
      pumpId: pump.id,
      pumpName: pump.name,
      workerId: assignment?.workerId ?? null,
      workerName: assignment?.worker.name ?? null,
    }
  })

  res.status(200).json(result)
}

const assignPump = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const { pumpId, workerId } = req.body as {
    pumpId?: unknown
    workerId?: unknown
  }
  if (
    typeof pumpId !== "number" ||
    !Number.isInteger(pumpId) ||
    pumpId <= 0 ||
    typeof workerId !== "number" ||
    !Number.isInteger(workerId) ||
    workerId <= 0
  ) {
    throw new AppError(
      "pumpId and workerId must be positive integers",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const [shift, pump, shiftWorker] = await Promise.all([
    prisma.shift.findUnique({ where: { id: shiftId } }),
    prisma.pump.findUnique({ where: { id: pumpId } }),
    prisma.shiftWorker.findUnique({
      where: { shiftId_workerId: { shiftId, workerId } },
    }),
  ])

  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }
  if (!pump || !pump.active) {
    throw new AppError(
      "Pump not found or inactive",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }
  if (!shiftWorker) {
    throw new AppError(
      "Worker must be assigned to this shift before assigning a pump",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  await prisma.shiftPumpAssignment.upsert({
    where: {
      shiftId_pumpId: {
        shiftId,
        pumpId,
      },
    },
    create: {
      shiftId,
      pumpId,
      workerId,
    },
    update: {
      workerId,
    },
  })

  res.status(204).send()
}

export {
  list,
  create,
  update,
  listWorkers,
  assignWorkers,
  unassignWorker,
  listStock,
  upsertStock,
  listPumpAssignments,
  assignPump,
  toShiftResponse,
}

