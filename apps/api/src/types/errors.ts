/**
 * Shared error type and codes for API error responses.
 * All errors returned to clients use the shape { error, code?, details? }.
 */

export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

export interface AppErrorPayload {
  error: string
  code?: ErrorCodeType
  details?: Record<string, unknown>
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: ErrorCodeType,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "AppError"
    Object.setPrototypeOf(this, AppError.prototype)
  }

  toJSON = (): AppErrorPayload => ({
    error: this.message,
    ...(this.code && { code: this.code }),
    ...(this.details && { details: this.details }),
  })
}
