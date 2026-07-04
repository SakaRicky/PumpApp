import type { Request, Response } from "express"
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  type ExpenseResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"
import { recordEvent } from "../services/events.js"

type ExpenseRow = Awaited<ReturnType<typeof prisma.expense.findMany>>[number]

const toResponse = (row: ExpenseRow): ExpenseResponse => ({
  id: row.id,
  date: row.date.toISOString(),
  category: row.category,
  amount: row.amount.toNumber(),
  paidBy: row.paidBy,
  description: row.description,
  recordedById: row.recordedById,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const parseDateRange = (
  req: Request
): { gte?: Date; lte?: Date } | undefined => {
  const fromParam = req.query.from
  const toParam = req.query.to
  const range: { gte?: Date; lte?: Date } = {}
  if (typeof fromParam === "string") {
    const from = new Date(fromParam)
    if (!Number.isNaN(from.getTime())) range.gte = from
  }
  if (typeof toParam === "string") {
    const to = new Date(toParam)
    if (!Number.isNaN(to.getTime())) range.lte = to
  }
  return range.gte || range.lte ? range : undefined
}

const list = async (req: Request, res: Response): Promise<void> => {
  const dateRange = parseDateRange(req)
  const categoryParam = req.query.category

  const rows = await prisma.expense.findMany({
    where: {
      ...(dateRange && { date: dateRange }),
      ...(typeof categoryParam === "string" &&
        categoryParam.trim() !== "" && { category: categoryParam.trim() }),
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  })

  res.status(200).json(rows.map(toResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parsed = expenseCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const actorId = req.user.id
  const { date, category, amount, paidBy, description } = parsed.data

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.expense.create({
      data: {
        date: new Date(date),
        category,
        amount,
        paidBy: paidBy ?? null,
        description: description ?? null,
        recordedById: actorId,
      },
    })
    await recordEvent(
      {
        type: "EXPENSE_RECORDED",
        actorUserId: actorId,
        entity: "expense",
        entityId: row.id,
        payload: { date, category, amount, paidBy: paidBy ?? null },
      },
      tx
    )
    return row
  })

  res.status(201).json(toResponse(created))
}

const update = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid expense id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = expenseUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.expense.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Expense not found", 404, ErrorCode.NOT_FOUND)
  }

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const actorId = req.user.id
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.expense.update({
      where: { id },
      data: {
        ...(parsed.data.date !== undefined && {
          date: new Date(parsed.data.date),
        }),
        ...(parsed.data.category !== undefined && {
          category: parsed.data.category,
        }),
        ...(parsed.data.amount !== undefined && { amount: parsed.data.amount }),
        ...(parsed.data.paidBy !== undefined && { paidBy: parsed.data.paidBy }),
        ...(parsed.data.description !== undefined && {
          description: parsed.data.description,
        }),
      },
    })
    await recordEvent(
      {
        type: "EXPENSE_UPDATED",
        actorUserId: actorId,
        entity: "expense",
        entityId: id,
        payload: {
          previous: {
            date: existing.date.toISOString(),
            category: existing.category,
            amount: existing.amount.toNumber(),
          },
          changes: parsed.data,
        },
      },
      tx
    )
    return row
  })

  res.status(200).json(toResponse(updated))
}

const remove = async (req: Request, res: Response): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid expense id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const existing = await prisma.expense.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Expense not found", 404, ErrorCode.NOT_FOUND)
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id } })
    await recordEvent(
      {
        type: "EXPENSE_DELETED",
        actorUserId: req.user?.id ?? null,
        entity: "expense",
        entityId: id,
        payload: {
          date: existing.date.toISOString(),
          category: existing.category,
          amount: existing.amount.toNumber(),
        },
      },
      tx
    )
  })

  res.status(204).send()
}

export { list, create, update, remove, toResponse }
