import { z } from "zod";

export const pumpCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  active: z.boolean().optional(),
});

export const pumpUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export type PumpCreateInput = z.infer<typeof pumpCreateSchema>;
export type PumpUpdateInput = z.infer<typeof pumpUpdateSchema>;
