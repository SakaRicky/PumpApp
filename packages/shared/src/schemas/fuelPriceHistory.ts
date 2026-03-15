import { z } from "zod"

export const fuelPriceCreateSchema = z.object({
  fuelTypeId: z.number().int().positive(),
  pricePerUnit: z.number().nonnegative(),
  purchasePricePerUnit: z.number().nonnegative().optional(),
  effectiveFrom: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  effectiveTo: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional()
    .nullable(),
})

export const fuelPriceUpdateSchema = z.object({
  pricePerUnit: z.number().nonnegative().optional(),
  purchasePricePerUnit: z.number().nonnegative().optional(),
  effectiveFrom: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
  effectiveTo: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional()
    .nullable(),
})

export type FuelPriceCreateInput = z.infer<typeof fuelPriceCreateSchema>
export type FuelPriceUpdateInput = z.infer<typeof fuelPriceUpdateSchema>
