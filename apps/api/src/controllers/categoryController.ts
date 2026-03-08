import type { Request, Response } from "express"
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  type CategoryResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

const toCategoryResponse = (row: {
  id: number
  name: string
  description: string | null
}): CategoryResponse => ({
  id: row.id,
  name: row.name,
  description: row.description,
})

const list = async (_req: Request, res: Response): Promise<void> => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  })
  res.status(200).json(categories.map(toCategoryResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parseResult = categoryCreateSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parseResult.error.flatten().fieldErrors,
    })
  }
  const category = await prisma.category.create({
    data: parseResult.data,
  })
  res.status(201).json(toCategoryResponse(category))
}

const update = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid category id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parseResult = categoryUpdateSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parseResult.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Category not found", 404, ErrorCode.NOT_FOUND)
  }

  const category = await prisma.category.update({
    where: { id },
    data: parseResult.data,
  })
  res.status(200).json(toCategoryResponse(category))
}

export { list, create, update, toCategoryResponse }
