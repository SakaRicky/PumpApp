import { z } from "zod"
import { ShiftStatus } from "../enums.js"

const shiftStatusValues = [
  ShiftStatus.PLANNED,
  ShiftStatus.OPEN,
  ShiftStatus.CLOSED,
  ShiftStatus.RECONCILED,
] as const

export const shiftCreateSchema = z.object({
  date: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  startTime: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  endTime: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  status: z.enum(shiftStatusValues),
  notes: z.string().optional(),
})

export const shiftUpdateSchema = z.object({
  date: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
  startTime: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/))
    .optional(),
  endTime: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/))
    .optional(),
  status: z.enum(shiftStatusValues).optional(),
  notes: z.string().optional().nullable(),
})

export const shiftWorkerAssignSchema = z
  .object({
    workerId: z.number().int().positive().optional(),
    workerIds: z.array(z.number().int().positive()).optional(),
  })
  .refine(
    (data) =>
      data.workerId !== undefined ||
      (data.workerIds !== undefined && data.workerIds.length > 0),
    {
      message: "Either workerId or workerIds must be provided",
    }
  )

export const shiftStockItemSchema = z.object({
  productId: z.number().int().positive(),
  openingQty: z.number().nonnegative().optional(),
  closingQty: z.number().nonnegative(),
})

export const shiftStockBulkUpdateSchema = z
  .array(shiftStockItemSchema)
  .min(1)

export const shiftPumpAssignmentSchema = z.object({
  pumpId: z.number().int().positive(),
  workerId: z.number().int().positive(),
})

export type ShiftCreateInput = z.infer<typeof shiftCreateSchema>
export type ShiftUpdateInput = z.infer<typeof shiftUpdateSchema>
export type ShiftWorkerAssignInput = z.infer<typeof shiftWorkerAssignSchema>
export type ShiftStockItemInput = z.infer<typeof shiftStockItemSchema>
export type ShiftStockBulkUpdateInput = z.infer<typeof shiftStockBulkUpdateSchema>
export type ShiftPumpAssignmentInput = z.infer<typeof shiftPumpAssignmentSchema>
