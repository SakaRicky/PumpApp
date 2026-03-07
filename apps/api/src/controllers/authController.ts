import type { Request, Response } from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { loginSchema } from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"
import type { Role } from "@pumpapp/shared"

const JWT_EXPIRES_IN = "7d"

const login = async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body)
  if (!parseResult.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parseResult.error.flatten().fieldErrors,
    })
  }
  const { username, password } = parseResult.data

  const user = await prisma.user.findUnique({
    where: { email: username },
  })

  if (!user || !user.active || user.userType !== "SYSTEM_USER") {
    throw new AppError("Invalid credentials", 401, ErrorCode.UNAUTHORIZED)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw new AppError("Invalid credentials", 401, ErrorCode.UNAUTHORIZED)
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new AppError("Server misconfiguration", 500, ErrorCode.INTERNAL_ERROR)
  }

  const payload = { id: user.id, role: user.role as Role }
  const token = jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN })

  res.status(200).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role as Role,
    },
  })
}

export { login }
