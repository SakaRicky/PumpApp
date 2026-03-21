import { z } from "zod"

export const cashHandInCreateSchema = z.object({
  workerId: z.number().int().positive(),
  amount: z.number().nonnegative(),
  /** Positive = missing / short; negative = surplus. Omit or null = no variance on this hand-in. */
  varianceAmount: z.number().finite().optional(),
  varianceNote: z.string().max(2000).optional().nullable(),
})

export type CashHandInCreateInput = z.infer<typeof cashHandInCreateSchema>

/** PATCH: any subset; at least one field required. Use null on variance fields to clear. */
export const cashHandInPatchSchema = z
  .object({
    workerId: z.number().int().positive().optional(),
    amount: z.number().nonnegative().optional(),
    varianceAmount: z.union([z.number().finite(), z.null()]).optional(),
    varianceNote: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .refine(
    (b) =>
      b.workerId !== undefined ||
      b.amount !== undefined ||
      b.varianceAmount !== undefined ||
      b.varianceNote !== undefined,
    { message: "At least one field must be provided" }
  )

export type CashHandInPatchInput = z.infer<typeof cashHandInPatchSchema>
