import { z } from "zod"

export const tankCreateSchema = z.object({
  fuelTypeId: z.number().int().positive(),
  name: z.string().min(1, "Name is required"),
  capacity: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
})

export const tankUpdateSchema = z.object({
  fuelTypeId: z.number().int().positive().optional(),
  name: z.string().min(1).optional(),
  capacity: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
  actualQuantity: z.number().nonnegative().optional(),
})

export type TankCreateInput = z.infer<typeof tankCreateSchema>
export type TankUpdateInput = z.infer<typeof tankUpdateSchema>

