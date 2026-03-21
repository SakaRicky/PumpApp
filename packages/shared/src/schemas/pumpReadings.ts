import { z } from "zod"

export const pumpReadingCreateSchema = z
  .object({
    pumpId: z.number().int().positive(),
    openingReading: z.number().nonnegative(),
    closingReading: z.number().nonnegative(),
  })
  .refine((data) => data.closingReading >= data.openingReading, {
    message:
      "Closing reading must be greater than or equal to the opening reading",
    path: ["closingReading"],
  })

export const pumpReadingUpdateSchema = z.object({
  openingReading: z.number().nonnegative().optional(),
  closingReading: z.number().nonnegative().optional(),
})

export type PumpReadingCreateInput = z.infer<typeof pumpReadingCreateSchema>
export type PumpReadingUpdateInput = z.infer<typeof pumpReadingUpdateSchema>
