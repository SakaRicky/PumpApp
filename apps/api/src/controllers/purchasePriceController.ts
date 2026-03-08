import type { Request, Response } from "express"
import {
  purchasePriceCreateSchema,
  type PurchasePriceCreateResponse,
  type PurchasePriceResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

const toPurchasePriceResponse = (row: {
  id: number
  productId: number
  purchasePrice: unknown
  effectiveAt: Date
  notes: string | null
}): PurchasePriceResponse => ({
  id: row.id,
  productId: row.productId,
  purchasePrice: Number(row.purchasePrice),
  effectiveAt: row.effectiveAt.toISOString(),
  notes: row.notes,
})

const list = async (req: Request, res: Response): Promise<void> => {
  const productId = parseInt(req.params.productId, 10)
  if (Number.isNaN(productId)) {
    throw new AppError("Invalid product id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  })
  if (!product) {
    throw new AppError("Product not found", 404, ErrorCode.NOT_FOUND)
  }

  const history = await prisma.purchasePriceHistory.findMany({
    where: { productId },
    orderBy: { effectiveAt: "desc" },
  })
  res.status(200).json(history.map(toPurchasePriceResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const productId = parseInt(req.params.productId, 10)
  if (Number.isNaN(productId)) {
    throw new AppError("Invalid product id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parseResult = purchasePriceCreateSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parseResult.error.flatten().fieldErrors,
    })
  }
  const { purchasePrice, effectiveAt, notes } = parseResult.data

  const product = await prisma.product.findUnique({
    where: { id: productId },
  })
  if (!product) {
    throw new AppError("Product not found", 404, ErrorCode.NOT_FOUND)
  }

  const previous = await prisma.purchasePriceHistory.findFirst({
    where: { productId },
    orderBy: { effectiveAt: "desc" },
  })
  const previousPrice = previous ? Number(previous.purchasePrice) : null
  const alert = previousPrice !== null && purchasePrice > previousPrice

  const row = await prisma.purchasePriceHistory.create({
    data: {
      productId,
      purchasePrice,
      effectiveAt: new Date(effectiveAt),
      notes: notes ?? null,
    },
  })

  const response: PurchasePriceCreateResponse = {
    ...toPurchasePriceResponse(row),
    ...(alert && { alert: true }),
  }
  res.status(201).json(response)
}

export { list, create, toPurchasePriceResponse }
