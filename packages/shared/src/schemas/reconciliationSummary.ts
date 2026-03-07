import { z } from "zod";
import { ShopSalesSource } from "../enums.js";

const shopSalesSourceValues = [
  ShopSalesSource.SHIFT_SUMMARY_ENTRY,
  ShopSalesSource.TRANSACTIONAL_SYSTEM_TOTAL,
  ShopSalesSource.MANUAL,
] as const;

export const reconciliationSummaryCreateSchema = z.object({
  shopSalesSource: z.enum(shopSalesSourceValues),
  systemShopSalesTotal: z.number().nonnegative().optional().nullable(),
  manualShopSalesTotal: z.number().nonnegative().optional().nullable(),
  effectiveShopSalesTotal: z.number(),
  manualShopSalesReason: z.string().optional().nullable(),
  fuelSalesTotal: z.number(),
  cashHandedTotal: z.number(),
  discrepancyAmount: z.number(),
  notes: z.string().optional().nullable(),
});

export const reconciliationSummaryUpdateSchema = z.object({
  shopSalesSource: z.enum(shopSalesSourceValues).optional(),
  systemShopSalesTotal: z.number().nonnegative().optional().nullable(),
  manualShopSalesTotal: z.number().nonnegative().optional().nullable(),
  effectiveShopSalesTotal: z.number().optional(),
  manualShopSalesReason: z.string().optional().nullable(),
  fuelSalesTotal: z.number().optional(),
  cashHandedTotal: z.number().optional(),
  discrepancyAmount: z.number().optional(),
  reviewedById: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ReconciliationSummaryCreateInput = z.infer<typeof reconciliationSummaryCreateSchema>;
export type ReconciliationSummaryUpdateInput = z.infer<typeof reconciliationSummaryUpdateSchema>;
