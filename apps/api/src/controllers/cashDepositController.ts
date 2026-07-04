import type { Request, Response } from "express"
import {
  cashDepositCreateSchema,
  cashDepositUpdateSchema,
  type CashDepositResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"
import { recordEvent } from "../services/events.js"

type DepositRow = Awaited<
  ReturnType<typeof prisma.cashDeposit.findMany>
>[number]

const toResponse = (row: DepositRow): CashDepositResponse => ({
  id: row.id,
  date: row.date.toISOString(),
  amount: row.amount.toNumber(),
  destination: row.destination,
  reference: row.reference,
  notes: row.notes,
  recordedById: row.recordedById,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const list = async (req: Request, res: Response): Promise<void> => {
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

  const rows = await prisma.cashDeposit.findMany({
    where: {
      ...((range.gte || range.lte) && { date: range }),
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  })

  res.status(200).json(rows.map(toResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parsed = cashDepositCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const actorId = req.user.id
  const { date, amount, destination, reference, notes } = parsed.data

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.cashDeposit.create({
      data: {
        date: new Date(date),
        amount,
        destination,
        reference: reference ?? null,
        notes: notes ?? null,
        recordedById: actorId,
      },
    })
    await recordEvent(
      {
        type: "CASH_DEPOSIT_RECORDED",
        actorUserId: actorId,
        entity: "cashDeposit",
        entityId: row.id,
        payload: { date, amount, destination, reference: reference ?? null },
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
    throw new AppError("Invalid deposit id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = cashDepositUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.cashDeposit.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Cash deposit not found", 404, ErrorCode.NOT_FOUND)
  }

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const actorId = req.user.id
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.cashDeposit.update({
      where: { id },
      data: {
        ...(parsed.data.date !== undefined && {
          date: new Date(parsed.data.date),
        }),
        ...(parsed.data.amount !== undefined && { amount: parsed.data.amount }),
        ...(parsed.data.destination !== undefined && {
          destination: parsed.data.destination,
        }),
        ...(parsed.data.reference !== undefined && {
          reference: parsed.data.reference,
        }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
    })
    await recordEvent(
      {
        type: "CASH_DEPOSIT_UPDATED",
        actorUserId: actorId,
        entity: "cashDeposit",
        entityId: id,
        payload: {
          previous: {
            date: existing.date.toISOString(),
            amount: existing.amount.toNumber(),
            destination: existing.destination,
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
    throw new AppError("Invalid deposit id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const existing = await prisma.cashDeposit.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Cash deposit not found", 404, ErrorCode.NOT_FOUND)
  }

  await prisma.$transaction(async (tx) => {
    await tx.cashDeposit.delete({ where: { id } })
    await recordEvent(
      {
        type: "CASH_DEPOSIT_DELETED",
        actorUserId: req.user?.id ?? null,
        entity: "cashDeposit",
        entityId: id,
        payload: {
          date: existing.date.toISOString(),
          amount: existing.amount.toNumber(),
          destination: existing.destination,
        },
      },
      tx
    )
  })

  res.status(204).send()
}

export { list, create, update, remove, toResponse }
