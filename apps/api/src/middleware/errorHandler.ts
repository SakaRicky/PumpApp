import type { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "../types/errors.js";

/**
 * Central error handler. Maps errors to HTTP status and API-DESIGN shape.
 * Never sends stack traces or secrets to the client.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (res.headersSent) {
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Zod / validation-style errors (optional: check err.name === 'ZodError' when used)
  if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "ZodError") {
    const message = "Validation failed";
    res.status(400).json({
      error: message,
      code: ErrorCode.VALIDATION_ERROR,
      details: (err as { errors?: unknown }).errors ?? undefined,
    });
    return;
  }

  // Unknown errors: log without secrets, return generic 500
  console.error("Unhandled error:", err instanceof Error ? err.message : String(err));
  res.status(500).json({
    error: "An unexpected error occurred",
    code: ErrorCode.INTERNAL_ERROR,
  });
};
