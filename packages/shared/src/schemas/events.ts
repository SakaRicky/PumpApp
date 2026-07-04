import { z } from "zod"
import { EventType } from "../enums.js"

export const eventListQuerySchema = z.object({
  type: z.nativeEnum(EventType).optional(),
  shiftId: z.coerce.number().int().positive().optional(),
  workerId: z.coerce.number().int().positive().optional(),
  from: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
  to: z
    .string()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type EventListQueryInput = z.infer<typeof eventListQuerySchema>
