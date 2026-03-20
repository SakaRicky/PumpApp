import { describe, it, expect, vi, beforeEach } from "vitest"
import { ShopSalesSource, ShiftStatus } from "@pumpapp/shared"
import {
  createShiftReconciliation,
  getReconciliationHints,
} from "./reconciliation.js"

const mockShiftFindUnique = vi.fn()
const mockSummaryFindUnique = vi.fn()
const mockStockCount = vi.fn()
const mockCashAggregate = vi.fn()
const mockTransaction = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    shift: {
      findUnique: (...args: unknown[]) => mockShiftFindUnique(...args),
      update: vi.fn().mockResolvedValue({}),
    },
    shiftReconciliationSummary: {
      findUnique: (...args: unknown[]) => mockSummaryFindUnique(...args),
      create: vi.fn(),
      update: vi.fn(),
    },
    shiftProductStock: {
      count: (...args: unknown[]) => mockStockCount(...args),
    },
    cashHandIn: {
      aggregate: (...args: unknown[]) => mockCashAggregate(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      mockTransaction(fn),
  },
}))

const mockFuelRevenue = vi.fn()
vi.mock("./fuelRevenue.js", () => ({
  getVolumeAndRevenueForShift: (...args: unknown[]) => mockFuelRevenue(...args),
}))

const mockShopStockTotal = vi.fn()
vi.mock("./shopShiftRevenue.js", () => ({
  getShopSalesTotalFromShiftStock: (...args: unknown[]) =>
    mockShopStockTotal(...args),
}))

const createdRow = {
  id: 1,
  shiftId: 1,
  shopSalesSource: ShopSalesSource.SHIFT_SUMMARY_ENTRY,
  systemShopSalesTotal: null,
  manualShopSalesTotal: null,
  effectiveShopSalesTotal: { toNumber: () => 50 },
  manualShopSalesReason: null,
  fuelSalesTotal: { toNumber: () => 100 },
  fuelSalesOverrideReason: null,
  cashHandedTotal: { toNumber: () => 120 },
  cashHandedTotalOverrideReason: null,
  discrepancyAmount: { toNumber: () => 30 },
  reviewedById: 1,
  notes: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
}

describe("reconciliation service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockShiftFindUnique.mockResolvedValue({
      id: 1,
      status: ShiftStatus.CLOSED,
    })
    mockStockCount.mockResolvedValue(2)
    mockShopStockTotal.mockResolvedValue(50)
    mockFuelRevenue.mockResolvedValue({
      totalRevenue: 100,
      totalVolume: 10,
      perPump: [],
    })
    mockCashAggregate.mockResolvedValue({ _sum: { amount: 120 } })
    mockTransaction.mockImplementation(
      async (
        fn: (tx: {
          shiftReconciliationSummary: { create: typeof vi.fn }
          shift: { update: typeof vi.fn }
        }) => Promise<void>
      ) => {
        await fn({
          shiftReconciliationSummary: {
            create: vi.fn().mockResolvedValue({}),
          },
          shift: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      }
    )
  })

  it("getReconciliationHints returns rounded aggregates", async () => {
    const hints = await getReconciliationHints(1)
    expect(hints.computedShopSalesTotal).toBe(50)
    expect(hints.computedFuelSalesTotal).toBe(100)
    expect(hints.sumCashHandIns).toBe(120)
    expect(hints.fuelComputationError).toBeNull()
  })

  it("createShiftReconciliation persists summary and uses server discrepancy", async () => {
    mockSummaryFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdRow)

    const result = await createShiftReconciliation({
      shiftId: 1,
      userId: 1,
      body: {
        shopSalesSource: ShopSalesSource.SHIFT_SUMMARY_ENTRY,
        notes: null,
      },
    })

    expect(mockTransaction).toHaveBeenCalled()
    expect(result.discrepancyAmount).toBe(30)
    expect(result.effectiveShopSalesTotal).toBe(50)
    expect(result.fuelSalesTotal).toBe(100)
    expect(result.cashHandedTotal).toBe(120)
  })

  it("createShiftReconciliation rejects when shift is not CLOSED", async () => {
    mockShiftFindUnique.mockResolvedValue({
      id: 1,
      status: ShiftStatus.OPEN,
    })

    await expect(
      createShiftReconciliation({
        shiftId: 1,
        userId: 1,
        body: { shopSalesSource: ShopSalesSource.SHIFT_SUMMARY_ENTRY },
      })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it("createShiftReconciliation rejects duplicate summary", async () => {
    mockSummaryFindUnique.mockResolvedValue(createdRow)

    await expect(
      createShiftReconciliation({
        shiftId: 1,
        userId: 1,
        body: { shopSalesSource: ShopSalesSource.SHIFT_SUMMARY_ENTRY },
      })
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it("createShiftReconciliation rejects SHIFT_SUMMARY_ENTRY without stock", async () => {
    mockSummaryFindUnique.mockResolvedValue(null)
    mockStockCount.mockResolvedValue(0)

    await expect(
      createShiftReconciliation({
        shiftId: 1,
        userId: 1,
        body: { shopSalesSource: ShopSalesSource.SHIFT_SUMMARY_ENTRY },
      })
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})
