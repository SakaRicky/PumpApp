import { z } from "zod"

const dateString = z
  .string()
  .datetime()
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))

export const expenseCreateSchema = z.object({
  date: dateString,
  category: z.string().trim().min(1).max(100),
  amount: z.number().positive(),
  paidBy: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
})

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>

export const expenseUpdateSchema = z.object({
  date: dateString.optional(),
  category: z.string().trim().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  paidBy: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
})

export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>

export const cashDepositCreateSchema = z.object({
  date: dateString,
  amount: z.number().positive(),
  destination: z.string().trim().min(1).max(200),
  reference: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
})

export type CashDepositCreateInput = z.infer<typeof cashDepositCreateSchema>

export const cashDepositUpdateSchema = z.object({
  date: dateString.optional(),
  amount: z.number().positive().optional(),
  destination: z.string().trim().min(1).max(200).optional(),
  reference: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
})

export type CashDepositUpdateInput = z.infer<typeof cashDepositUpdateSchema>
