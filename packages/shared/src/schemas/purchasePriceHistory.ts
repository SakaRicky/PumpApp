import { z } from "zod";

export const purchasePriceCreateSchema = z.object({
  purchasePrice: z.number().nonnegative(),
  effectiveAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  notes: z.string().optional().nullable(),
});

export type PurchasePriceCreateInput = z.infer<typeof purchasePriceCreateSchema>;
