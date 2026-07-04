import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getWorkerShortageBalances,
  getWorkerShortageLedger,
} from "./shortages.js"

const mockWorkerFindMany = vi.fn()
const mockWorkerFindUnique = vi.fn()
const mockWeeklyGroupBy = vi.fn()
const mockWeeklyFindMany = vi.fn()
const mockSettlementGroupBy = vi.fn()
const mockSettlementFindMany = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    worker: {
      findMany: (...args: unknown[]) => mockWorkerFindMany(...args),
      findUnique: (...args: unknown[]) => mockWorkerFindUnique(...args),
    },
    weeklyInventoryClose: {
      groupBy: (...args: unknown[]) => mockWeeklyGroupBy(...args),
      findMany: (...args: unknown[]) => mockWeeklyFindMany(...args),
    },
    shortageSettlement: {
      groupBy: (...args: unknown[]) => mockSettlementGroupBy(...args),
      findMany: (...args: unknown[]) => mockSettlementFindMany(...args),
    },
  },
}))

describe("shortage ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("balances = charges − settlements per worker, workers with no activity omitted", async () => {
    mockWorkerFindMany.mockResolvedValue([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Clean" },
    ])
    mockWeeklyGroupBy.mockResolvedValue([
      { workerId: 1, _sum: { enforcedShortfall: 5000 } },
      { workerId: 2, _sum: { enforcedShortfall: 2000 } },
    ])
    mockSettlementGroupBy.mockResolvedValue([
      { workerId: 1, _sum: { amount: 3000 } },
    ])

    const balances = await getWorkerShortageBalances()

    expect(balances).toEqual([
      {
        workerId: 1,
        workerName: "Alice",
        chargesTotal: 5000,
        settlementsTotal: 3000,
        balance: 2000,
      },
      {
        workerId: 2,
        workerName: "Bob",
        chargesTotal: 2000,
        settlementsTotal: 0,
        balance: 2000,
      },
    ])
  })

  it("ledger interleaves charges and settlements by date with running balance", async () => {
    mockWorkerFindUnique.mockResolvedValue({ id: 1, name: "Alice" })
    mockWeeklyFindMany.mockResolvedValue([
      {
        id: 10,
        weekStart: new Date("2026-06-01"),
        weekEnd: new Date("2026-06-07"),
        enforcedShortfall: { toNumber: () => 5000 },
        notes: null,
      },
      {
        id: 11,
        weekStart: new Date("2026-06-15"),
        weekEnd: new Date("2026-06-21"),
        enforcedShortfall: { toNumber: () => 1000 },
        notes: null,
      },
    ])
    mockSettlementFindMany.mockResolvedValue([
      {
        id: 20,
        date: new Date("2026-06-10"),
        amount: { toNumber: () => 3000 },
        notes: "retenue salaire",
      },
    ])

    const ledger = await getWorkerShortageLedger(1)

    expect(ledger.balance).toBe(3000)
    expect(ledger.chargesTotal).toBe(6000)
    expect(ledger.settlementsTotal).toBe(3000)
    expect(ledger.entries.map((e) => [e.kind, e.balanceAfter])).toEqual([
      ["charge", 5000],
      ["settlement", 2000],
      ["charge", 3000],
    ])
  })

  it("rejects an unknown worker", async () => {
    mockWorkerFindUnique.mockResolvedValue(null)
    await expect(getWorkerShortageLedger(999)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
