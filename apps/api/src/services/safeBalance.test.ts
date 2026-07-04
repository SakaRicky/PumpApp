import { describe, it, expect, vi, beforeEach } from "vitest"
import { getSafeBalance } from "./safeBalance.js"

const mockSummaryAggregate = vi.fn()
const mockExpenseAggregate = vi.fn()
const mockDepositAggregate = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    shiftReconciliationSummary: {
      aggregate: (...args: unknown[]) => mockSummaryAggregate(...args),
    },
    expense: {
      aggregate: (...args: unknown[]) => mockExpenseAggregate(...args),
    },
    cashDeposit: {
      aggregate: (...args: unknown[]) => mockDepositAggregate(...args),
    },
  },
}))

describe("safe balance projection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("computes cash collected − expenses − deposits", async () => {
    mockSummaryAggregate.mockResolvedValue({
      _sum: { cashHandedTotal: 250000 },
    })
    mockExpenseAggregate.mockResolvedValue({ _sum: { amount: 40000 } })
    mockDepositAggregate.mockResolvedValue({ _sum: { amount: 150000 } })

    const result = await getSafeBalance()

    expect(result).toEqual({
      cashCollected: 250000,
      expensesTotal: 40000,
      depositsTotal: 150000,
      balance: 60000,
    })
  })

  it("treats missing sums as zero", async () => {
    mockSummaryAggregate.mockResolvedValue({ _sum: { cashHandedTotal: null } })
    mockExpenseAggregate.mockResolvedValue({ _sum: { amount: null } })
    mockDepositAggregate.mockResolvedValue({ _sum: { amount: null } })

    const result = await getSafeBalance()

    expect(result).toEqual({
      cashCollected: 0,
      expensesTotal: 0,
      depositsTotal: 0,
      balance: 0,
    })
  })

  it("supports a negative balance (more spent than collected)", async () => {
    mockSummaryAggregate.mockResolvedValue({ _sum: { cashHandedTotal: 1000 } })
    mockExpenseAggregate.mockResolvedValue({ _sum: { amount: 2500 } })
    mockDepositAggregate.mockResolvedValue({ _sum: { amount: 0 } })

    const result = await getSafeBalance()

    expect(result.balance).toBe(-1500)
  })
})
