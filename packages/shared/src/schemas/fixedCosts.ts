import { z } from "zod"

export const fixedCostCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  monthlyAmount: z.number().nonnegative(),
  effectiveMonth: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}/)),
  notes: z.string().optional().nullable(),
})

export const fixedCostUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  monthlyAmount: z.number().nonnegative().optional(),
  effectiveMonth: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}/))
    .optional(),
  notes: z.string().optional().nullable(),
})

export type FixedCostCreateInput = z.infer<typeof fixedCostCreateSchema>
export type FixedCostUpdateInput = z.infer<typeof fixedCostUpdateSchema>
