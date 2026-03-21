import { z } from "zod"

export const cashHandInCreateSchema = z.object({
  workerId: z.number().int().positive(),
  amount: z.number().nonnegative(),
  /** Positive = missing / short; negative = surplus. Omit or null = no variance on this hand-in. */
  varianceAmount: z.number().finite().optional(),
  varianceNote: z.string().max(2000).optional().nullable(),
})

export type CashHandInCreateInput = z.infer<typeof cashHandInCreateSchema>

/** PATCH body: set fields to null to clear variance on that hand-in row. */
export const cashHandInVariancePatchSchema = z
  .object({
    varianceAmount: z.union([z.number().finite(), z.null()]).optional(),
    varianceNote: z.union([z.string().max(2000), z.null()]).optional(),
  })
  .refine(
    (b) => b.varianceAmount !== undefined || b.varianceNote !== undefined,
    {
      message:
        "At least one of varianceAmount or varianceNote must be provided",
    }
  )

export type CashHandInVariancePatchInput = z.infer<
  typeof cashHandInVariancePatchSchema
>
