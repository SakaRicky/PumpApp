import { z } from "zod"

export const fuelDeliveryCreateSchema = z.object({
  quantity: z.number().nonnegative(),
  deliveredAt: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
  notes: z.string().optional(),
})

export type FuelDeliveryCreateInput = z.infer<typeof fuelDeliveryCreateSchema>
