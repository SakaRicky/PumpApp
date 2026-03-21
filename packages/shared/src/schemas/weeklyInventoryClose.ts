import { z } from "zod"

export const weeklyInventoryCountLineSchema = z.object({
  productId: z.number().int().positive(),
  physicalQty: z.number().nonnegative(),
})

export const weeklyInventoryCloseCreateSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  workerId: z.number().int().positive(),
  enforcedShortfall: z.number(),
  notes: z.string().optional(),
  physicalCountAt: z.string().datetime().optional().nullable(),
  lines: z.array(weeklyInventoryCountLineSchema).optional(),
})

export type WeeklyInventoryCloseCreateInput = z.infer<
  typeof weeklyInventoryCloseCreateSchema
>
