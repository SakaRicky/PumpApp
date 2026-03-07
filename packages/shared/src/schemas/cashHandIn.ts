import { z } from "zod";

export const cashHandInCreateSchema = z.object({
  workerId: z.number().int().positive().optional().nullable(),
  amount: z.number().nonnegative(),
});

export type CashHandInCreateInput = z.infer<typeof cashHandInCreateSchema>;
