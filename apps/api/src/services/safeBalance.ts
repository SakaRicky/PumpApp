import type { SafeBalanceResponse } from "@pumpapp/shared"
import { prisma } from "../db.js"

const roundMoney = (n: number): number => Math.round(n * 100) / 100

/**
 * Safe balance projection: everything counted into the safe at reconciliation
 * time, minus cash spent (expenses) and cash moved out (bank deposits).
 */
export const getSafeBalance = async (): Promise<SafeBalanceResponse> => {
  const [cashAgg, expenseAgg, depositAgg] = await Promise.all([
    prisma.shiftReconciliationSummary.aggregate({
      _sum: { cashHandedTotal: true },
    }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.cashDeposit.aggregate({ _sum: { amount: true } }),
  ])

  const cashCollected = roundMoney(Number(cashAgg._sum.cashHandedTotal ?? 0))
  const expensesTotal = roundMoney(Number(expenseAgg._sum.amount ?? 0))
  const depositsTotal = roundMoney(Number(depositAgg._sum.amount ?? 0))

  return {
    cashCollected,
    expensesTotal,
    depositsTotal,
    balance: roundMoney(cashCollected - expensesTotal - depositsTotal),
  }
}
