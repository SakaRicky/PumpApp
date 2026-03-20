import type { Request, Response } from "express"
import {
  reconciliationSummaryWriteCreateSchema,
  reconciliationSummaryWriteUpdateSchema,
} from "@pumpapp/shared"
import { AppError, ErrorCode } from "../types/errors.js"
import {
  createShiftReconciliation,
  getReconciliationGetResponse,
  updateShiftReconciliation,
} from "../services/reconciliation.js"

const getByShift = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const payload = await getReconciliationGetResponse(shiftId)
  res.status(200).json(payload)
}

const createForShift = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = reconciliationSummaryWriteCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const summary = await createShiftReconciliation({
    shiftId,
    userId: req.user.id,
    body: parsed.data,
  })

  res.status(201).json(summary)
}

const updateForShift = async (req: Request, res: Response): Promise<void> => {
  const shiftId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(shiftId)) {
    throw new AppError("Invalid shift id", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = reconciliationSummaryWriteUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError("Validation failed", 400, ErrorCode.VALIDATION_ERROR, {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  if (!req.user) {
    throw new AppError("Unauthorized", 401, ErrorCode.UNAUTHORIZED)
  }

  const summary = await updateShiftReconciliation({
    shiftId,
    userId: req.user.id,
    body: parsed.data,
  })

  res.status(200).json(summary)
}

export { getByShift, createForShift, updateForShift }
