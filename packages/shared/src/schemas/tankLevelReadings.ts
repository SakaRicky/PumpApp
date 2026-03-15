import { z } from "zod"

export const tankLevelReadingCreateSchema = z.object({
  quantity: z.number().nonnegative(),
  measuredAt: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
})

export type TankLevelReadingCreateInput = z.infer<
  typeof tankLevelReadingCreateSchema
>

export const tankLevelReadingUpdateSchema = z.object({
  quantity: z.number().nonnegative().optional(),
  measuredAt: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
})

export type TankLevelReadingUpdateInput = z.infer<
  typeof tankLevelReadingUpdateSchema
>
