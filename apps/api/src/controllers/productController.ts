import type { Request, Response } from "express"
import {
  productCreateSchema,
  productUpdateSchema,
  type ProductResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type ProductWithCategory = Awaited<
  ReturnType<typeof prisma.product.findMany<{ include: { category: true } }>>
>[number]

const toProductResponse = (row: ProductWithCategory): ProductResponse => ({
  id: row.id,
  name: row.name,
  categoryId: row.categoryId,
  sellingPrice: Number(row.sellingPrice),
  currentStock: Number(row.currentStock),
  active: row.active,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  ...(row.category && {
    category: { id: row.category.id, name: row.category.name },
  }),
})

const list = async (_req: Request, res: Response): Promise<void> => {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  })
  res.status(200).json(products.map(toProductResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parseResult = productCreateSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parseResult.error.flatten().fieldErrors,
    })
  }
  const { name, categoryId, sellingPrice, currentStock, active } =
    parseResult.data

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  })
  if (!category) {
    throw new AppError("Category not found", 400, ErrorCode.VALIDATION_ERROR)
  }

  const product = await prisma.product.create({
    data: {
      name,
      categoryId,
      sellingPrice,
      currentStock: currentStock ?? 0,
      active: active ?? true,
    },
    include: { category: true },
  })
  res.status(201).json(toProductResponse(product))
}

const update = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid product id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parseResult = productUpdateSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parseResult.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  })
  if (!existing) {
    throw new AppError("Product not found", 404, ErrorCode.NOT_FOUND)
  }

  const data = parseResult.data
  if (data.categoryId !== undefined) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    })
    if (!category) {
      throw new AppError("Category not found", 400, ErrorCode.VALIDATION_ERROR)
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.sellingPrice !== undefined && {
        sellingPrice: data.sellingPrice,
      }),
      ...(data.currentStock !== undefined && {
        currentStock: data.currentStock,
      }),
      ...(data.active !== undefined && { active: data.active }),
    },
    include: { category: true },
  })
  res.status(200).json(toProductResponse(product))
}

export { list, create, update, toProductResponse }
