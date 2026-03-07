import { z } from "zod";

export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

export const productCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.number().int().positive(),
  sellingPrice: z.number().nonnegative(),
  currentStock: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
});

export const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  categoryId: z.number().int().positive().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  currentStock: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
