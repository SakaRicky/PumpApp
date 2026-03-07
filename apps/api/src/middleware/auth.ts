import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { Role } from "@pumpapp/shared"
import { AppError, ErrorCode } from "../types/errors.js"

interface JwtPayload {
  id: number
  role: Role
}

const getBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization
  if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null
  }
  return header.slice(7).trim() || null
}

/**
 * Validates Authorization: Bearer <token>, verifies JWT, and attaches user id/role to req.user.
 * Responds 401 if header missing or token invalid/expired.
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const token = getBearerToken(req)
  if (!token) {
    next(
      new AppError(
        "Missing or invalid authorization",
        401,
        ErrorCode.UNAUTHORIZED
      )
    )
    return
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    next(new AppError("Server misconfiguration", 500, ErrorCode.INTERNAL_ERROR))
    return
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload
    req.user = { id: decoded.id, role: decoded.role }
    next()
  } catch {
    next(new AppError("Invalid or expired token", 401, ErrorCode.UNAUTHORIZED))
  }
}

/**
 * ADMIN-only guard. Use after requireAuth. Returns 403 if req.user.role !== 'ADMIN'.
 */
export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED))
    return
  }
  if (req.user.role !== Role.ADMIN) {
    next(new AppError("Forbidden", 403, ErrorCode.FORBIDDEN))
    return
  }
  next()
}
