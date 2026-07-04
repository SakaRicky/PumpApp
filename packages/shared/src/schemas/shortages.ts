import { z } from "zod"

const dateString = z
  .string()
  .datetime()
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))

export const shortageSettlementCreateSchema = z.object({
  workerId: z.number().int().positive(),
  date: dateString,
  amount: z.number().positive(),
  notes: z.string().trim().max(1000).nullable().optional(),
})

export type ShortageSettlementCreateInput = z.infer<
  typeof shortageSettlementCreateSchema
>

export const settingPutSchema = z.object({
  value: z.unknown(),
})

export type SettingPutInput = z.infer<typeof settingPutSchema>
