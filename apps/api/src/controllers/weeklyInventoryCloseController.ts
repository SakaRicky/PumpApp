import type { Request, Response } from "express"
import type { Prisma } from "../../node_modules/.prisma/client/index.js"
import {
  weeklyInventoryCloseCreateSchema,
  type WeeklyInventoryCloseResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type CloseRow = Prisma.WeeklyInventoryCloseGetPayload<{
  include: { worker: true; lines: true }
}>

/** Sum of variance amounts recorded on cash hand-ins for this worker in the week (null variances ignored). */
const sumDailyCashShortfallsForWeek = async ({
  workerId,
  weekStart,
  weekEnd,
}: {
  workerId: number
  weekStart: Date
  weekEnd: Date
}): Promise<number> => {
  const agg = await prisma.cashHandIn.aggregate({
    where: {
      workerId,
      varianceAmount: { not: null },
      shift: {
        date: { gte: weekStart, lte: weekEnd },
      },
    },
    _sum: { varianceAmount: true },
  })
  return Number(agg._sum.varianceAmount ?? 0)
}

const toResponse = async (
  row: CloseRow
): Promise<WeeklyInventoryCloseResponse> => {
  const sumDailyCashShortfalls = await sumDailyCashShortfallsForWeek({
    workerId: row.workerId,
    weekStart: row.weekStart,
    weekEnd: row.weekEnd,
  })
  return {
    id: row.id,
    weekStart: row.weekStart.toISOString().slice(0, 10),
    weekEnd: row.weekEnd.toISOString().slice(0, 10),
    workerId: row.workerId,
    workerName: row.worker.name,
    enforcedShortfall: Number(row.enforcedShortfall),
    notes: row.notes,
    physicalCountAt: row.physicalCountAt?.toISOString() ?? null,
    recordedById: row.recordedById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sumDailyCashShortfalls,
    lines: row.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      physicalQty: Number(l.physicalQty),
    })),
  }
}

const list = async (req: Request, res: Response): Promise<void> => {
  const workerIdRaw = req.query.workerId
  const workerId =
    workerIdRaw !== undefined
      ? Number.parseInt(String(workerIdRaw), 10)
      : undefined
  const from = req.query.from ? new Date(String(req.query.from)) : undefined
  const to = req.query.to ? new Date(String(req.query.to)) : undefined

  const where: Prisma.WeeklyInventoryCloseWhereInput = {}
  if (workerId !== undefined && !Number.isNaN(workerId)) {
    where.workerId = workerId
  }
  if (from || to) {
    where.AND = []
    if (from) where.AND.push({ weekEnd: { gte: from } })
    if (to) where.AND.push({ weekStart: { lte: to } })
  }

  const rows = await prisma.weeklyInventoryClose.findMany({
    where,
    include: { worker: true, lines: true },
    orderBy: [{ weekStart: "desc" }, { workerId: "asc" }],
  })

  const out = await Promise.all(rows.map((r) => toResponse(r)))
  res.status(200).json(out)
}

const getById = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid id", 400, ErrorCode.VALIDATION_ERROR)
  }
  const row = await prisma.weeklyInventoryClose.findUnique({
    where: { id },
    include: { worker: true, lines: true },
  })
  if (!row) {
    throw new AppError("Not found", 404, ErrorCode.NOT_FOUND)
  }
  res.status(200).json(await toResponse(row))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parsed = weeklyInventoryCloseCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const {
    weekStart,
    weekEnd,
    workerId,
    enforcedShortfall,
    notes,
    physicalCountAt,
    lines,
  } = parsed.data

  const ws = new Date(weekStart)
  const we = new Date(weekEnd)
  if (we < ws) {
    throw new AppError(
      "weekEnd must be on or after weekStart",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const worker = await prisma.worker.findUnique({ where: { id: workerId } })
  if (!worker || !worker.active) {
    throw new AppError(
      "Worker not found or inactive",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const lineItems = lines ?? []
  const productIds = lineItems.map((l) => l.productId)
  if (productIds.length > 0) {
    const unique = new Set(productIds)
    const products = await prisma.product.findMany({
      where: { id: { in: [...unique] } },
    })
    if (products.length !== unique.size) {
      throw new AppError(
        "Some products do not exist",
        400,
        ErrorCode.VALIDATION_ERROR
      )
    }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      return tx.weeklyInventoryClose.create({
        data: {
          weekStart: ws,
          weekEnd: we,
          workerId,
          enforcedShortfall,
          notes: notes ?? null,
          physicalCountAt: physicalCountAt ? new Date(physicalCountAt) : null,
          recordedById: req.user!.id,
          ...(lineItems.length > 0
            ? {
                lines: {
                  create: lineItems.map((l) => ({
                    productId: l.productId,
                    physicalQty: l.physicalQty,
                  })),
                },
              }
            : {}),
        },
        include: {
          worker: true,
          lines: true,
        },
      })
    })
    res.status(201).json(await toResponse(created))
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      throw new AppError(
        "A weekly close already exists for this worker and week start",
        409,
        ErrorCode.CONFLICT
      )
    }
    throw e
  }
}

const exportCsv = async (req: Request, res: Response): Promise<void> => {
  const month = req.query.month as string | undefined
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError(
      "Invalid month (use YYYY-MM)",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }
  const [y, m] = month.split("-").map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1))
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))

  const rows = await prisma.weeklyInventoryClose.findMany({
    where: {
      weekStart: { lte: end },
      weekEnd: { gte: start },
    },
    include: { worker: true },
    orderBy: [{ weekStart: "asc" }, { workerId: "asc" }],
  })

  const header =
    "weekStart,weekEnd,workerName,enforcedShortfall,sumDailyCashShortfalls,notes"
  const bodyLines: string[] = []
  for (const row of rows) {
    const sumDaily = await sumDailyCashShortfallsForWeek({
      workerId: row.workerId,
      weekStart: row.weekStart,
      weekEnd: row.weekEnd,
    })
    const note = (row.notes ?? "").replace(/"/g, '""')
    bodyLines.push(
      [
        row.weekStart.toISOString().slice(0, 10),
        row.weekEnd.toISOString().slice(0, 10),
        `"${row.worker.name.replace(/"/g, '""')}"`,
        Number(row.enforcedShortfall).toFixed(2),
        sumDaily.toFixed(2),
        `"${note}"`,
      ].join(",")
    )
  }

  const csv = [header, ...bodyLines].join("\n")
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="weekly-inventory-${month}.csv"`
  )
  res.status(200).send(csv)
}

export { list, getById, create, exportCsv }
