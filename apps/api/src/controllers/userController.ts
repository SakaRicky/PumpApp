import type { Request, Response } from "express"
import bcrypt from "bcrypt"
import {
  userCreateSchema,
  userUpdateSchema,
  type UserResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

const BCRYPT_ROUNDS = 10

type UserWithWorker = Awaited<
  ReturnType<typeof prisma.user.findMany<{ include: { worker: true } }>>
>[number]

const toUserResponse = (user: UserWithWorker): UserResponse => ({
  id: user.id,
  workerId: user.workerId,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
  ...(user.worker && {
    worker: { id: user.worker.id, name: user.worker.name },
  }),
})

const list = async (_req: Request, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    include: { worker: true },
  })
  res.status(200).json(users.map(toUserResponse))
}

const create = async (req: Request, res: Response): Promise<void> => {
  const parseResult = userCreateSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parseResult.error.flatten().fieldErrors,
    })
  }
  const { workerId, name, email, password, role } = parseResult.data

  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    include: { user: true },
  })
  if (!worker) {
    throw new AppError("Worker not found", 400, ErrorCode.VALIDATION_ERROR)
  }
  if (worker.user) {
    throw new AppError(
      "Worker already has a user account",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await prisma.user.create({
    data: {
      workerId,
      name,
      email,
      passwordHash,
      role,
    },
    include: { worker: true },
  })
  res.status(201).json(toUserResponse(user))
}

const update = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10)
  if (Number.isNaN(id)) {
    throw new AppError("Invalid user id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parseResult = userUpdateSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parseResult.error.flatten().fieldErrors,
    })
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { worker: true },
  })
  if (!existing) {
    throw new AppError("User not found", 404, ErrorCode.NOT_FOUND)
  }

  const user = await prisma.user.update({
    where: { id },
    data: parseResult.data,
    include: { worker: true },
  })
  res.status(200).json(toUserResponse(user))
}

export { list, create, update, toUserResponse }
