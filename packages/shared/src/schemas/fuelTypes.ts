import { z } from "zod"

export const fuelTypeCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  active: z.boolean().optional(),
})

export const fuelTypeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
})

export type FuelTypeCreateInput = z.infer<typeof fuelTypeCreateSchema>
export type FuelTypeUpdateInput = z.infer<typeof fuelTypeUpdateSchema>
