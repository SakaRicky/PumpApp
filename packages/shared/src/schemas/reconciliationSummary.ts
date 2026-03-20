import { z } from "zod"
import { ShopSalesSource } from "../enums.js"

/** Phase 1 write: only shift stock summary or manual shop total. */
const phase1ShopSalesSourceValues = [
  ShopSalesSource.SHIFT_SUMMARY_ENTRY,
  ShopSalesSource.MANUAL,
] as const

export const reconciliationSummaryWriteCreateSchema = z
  .object({
    shopSalesSource: z.enum(phase1ShopSalesSourceValues),
    manualShopSalesTotal: z.number().nonnegative().optional(),
    manualShopSalesReason: z.string().optional().nullable(),
    fuelSalesTotal: z.number().optional(),
    fuelSalesOverrideReason: z.string().optional().nullable(),
    cashHandedTotal: z.number().optional(),
    cashHandedTotalOverrideReason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.shopSalesSource === ShopSalesSource.MANUAL) {
      if (data.manualShopSalesTotal === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manualShopSalesTotal"],
          message:
            "manualShopSalesTotal is required when shopSalesSource is MANUAL",
        })
      }
      if (
        data.manualShopSalesReason === undefined ||
        data.manualShopSalesReason === null ||
        data.manualShopSalesReason.trim() === ""
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manualShopSalesReason"],
          message:
            "manualShopSalesReason is required when shopSalesSource is MANUAL",
        })
      }
    }
    if (data.fuelSalesTotal !== undefined) {
      if (
        data.fuelSalesOverrideReason === undefined ||
        data.fuelSalesOverrideReason === null ||
        data.fuelSalesOverrideReason.trim() === ""
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fuelSalesOverrideReason"],
          message:
            "fuelSalesOverrideReason is required when fuelSalesTotal is overridden",
        })
      }
    }
    if (data.cashHandedTotal !== undefined) {
      if (
        data.cashHandedTotalOverrideReason === undefined ||
        data.cashHandedTotalOverrideReason === null ||
        data.cashHandedTotalOverrideReason.trim() === ""
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cashHandedTotalOverrideReason"],
          message:
            "cashHandedTotalOverrideReason is required when cashHandedTotal is overridden",
        })
      }
    }
  })

export const reconciliationSummaryWriteUpdateSchema = z
  .object({
    shopSalesSource: z.enum(phase1ShopSalesSourceValues).optional(),
    manualShopSalesTotal: z.number().nonnegative().optional(),
    manualShopSalesReason: z.string().optional().nullable(),
    fuelSalesTotal: z.number().optional(),
    fuelSalesOverrideReason: z.string().optional().nullable(),
    cashHandedTotal: z.number().optional(),
    cashHandedTotalOverrideReason: z.string().optional().nullable(),
    reviewedById: z.number().int().positive().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.shopSalesSource === ShopSalesSource.MANUAL) {
      if (data.manualShopSalesTotal === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manualShopSalesTotal"],
          message:
            "manualShopSalesTotal is required when shopSalesSource is MANUAL",
        })
      }
      if (
        data.manualShopSalesReason === undefined ||
        data.manualShopSalesReason === null ||
        data.manualShopSalesReason.trim() === ""
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manualShopSalesReason"],
          message:
            "manualShopSalesReason is required when shopSalesSource is MANUAL",
        })
      }
    }
    if (data.fuelSalesTotal !== undefined) {
      if (
        data.fuelSalesOverrideReason === undefined ||
        data.fuelSalesOverrideReason === null ||
        data.fuelSalesOverrideReason.trim() === ""
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fuelSalesOverrideReason"],
          message:
            "fuelSalesOverrideReason is required when fuelSalesTotal is overridden",
        })
      }
    }
    if (data.cashHandedTotal !== undefined) {
      if (
        data.cashHandedTotalOverrideReason === undefined ||
        data.cashHandedTotalOverrideReason === null ||
        data.cashHandedTotalOverrideReason.trim() === ""
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cashHandedTotalOverrideReason"],
          message:
            "cashHandedTotalOverrideReason is required when cashHandedTotal is overridden",
        })
      }
    }
  })

export type ReconciliationSummaryWriteCreateInput = z.infer<
  typeof reconciliationSummaryWriteCreateSchema
>
export type ReconciliationSummaryWriteUpdateInput = z.infer<
  typeof reconciliationSummaryWriteUpdateSchema
>
