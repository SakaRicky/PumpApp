import { ShiftStatus } from "@pumpapp/shared"
import { AppError, ErrorCode } from "../types/errors.js"

/**
 * A reconciled shift is locked: readings, cash hand-ins, stock and
 * assignments must be rejected at the API layer, not just hidden in the UI.
 * Corrections go through reopening the shift (RECONCILED → CLOSED, admin
 * only) or updating the reconciliation itself.
 */
export const assertShiftMutable = (shift: { status: string }): void => {
  if (shift.status === ShiftStatus.RECONCILED) {
    throw new AppError(
      "Shift is reconciled and locked; reopen it (set status to CLOSED) before modifying its data",
      409,
      ErrorCode.CONFLICT
    )
  }
}
