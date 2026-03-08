import type { Request, Response } from "express"
import {
  workerCreateSchema,
  workerUpdateSchema,
  type WorkerResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

type WorkerRow = Awaited<ReturnType<typeof prisma.worker.findMany>>[number]

const toWorkerResponse = (worker: WorkerRow): WorkerResponse => ({
  id: worker.id,
  name: worker.name,
  designation: worker.designation ?? null,
  active: worker.active,
  createdAt: worker.createdAt.toISOString(),
  updatedAt: worker.updatedAt.toISOString(),
})

const list = async (_req: Request, res: Response): Promise<void> => {
  const workers = await prisma.worker.findMany()
  res.status(200).json(workers.map(toWorkerResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parseResult = workerCreateSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parseResult.error.flatten().fieldErrors,
    })
  }

  const worker = await prisma.worker.create({
    data: parseResult.data,
  })
  res.status(201).json(toWorkerResponse(worker))
}

const update = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid worker id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parseResult = workerUpdateSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parseResult.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.worker.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError("Worker not found", 404, ErrorCode.NOT_FOUND)
  }

  const worker = await prisma.worker.update({
    where: { id },
    data: parseResult.data,
  })
  res.status(200).json(toWorkerResponse(worker))
}

export { list, create, update, toWorkerResponse }
