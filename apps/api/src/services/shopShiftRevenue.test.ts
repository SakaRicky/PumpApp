import { describe, expect, it, vi, beforeEach } from "vitest"
import { getShopSalesTotalFromShiftStock } from "./shopShiftRevenue.js"

const mockFindMany = vi.fn()
const mockShiftFindUnique = vi.fn()
const mockPriceHistoryFindMany = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    shiftProductStock: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    shift: {
      findUnique: (...args: unknown[]) => mockShiftFindUnique(...args),
    },
    sellingPriceHistory: {
      findMany: (...args: unknown[]) => mockPriceHistoryFindMany(...args),
    },
  },
}))

describe("getShopSalesTotalFromShiftStock", () => {
  beforeEach(() => {
    mockFindMany.mockReset()
    mockShiftFindUnique.mockReset()
    mockPriceHistoryFindMany.mockReset()
    mockShiftFindUnique.mockResolvedValue({
      id: 1,
      endTime: new Date("2026-07-01T14:00:00.000Z"),
    })
    mockPriceHistoryFindMany.mockResolvedValue([])
  })

  it("sums soldQty * sellingPrice per line (fallback to current price)", async () => {
    mockFindMany.mockResolvedValue([
      {
        productId: 1,
        openingQty: 10,
        receivedQty: 0,
        closingQty: 7,
        product: { sellingPrice: 2.5 },
      },
      {
        productId: 2,
        openingQty: 5,
        receivedQty: 0,
        closingQty: 5,
        product: { sellingPrice: 1 },
      },
    ])

    const total = await getShopSalesTotalFromShiftStock(1)
    expect(total).toBe(7.5)
  })

  it("values lines at the price effective on the shift date", async () => {
    mockFindMany.mockResolvedValue([
      {
        productId: 1,
        openingQty: 10,
        receivedQty: 0,
        closingQty: 7,
        product: { sellingPrice: 99 },
      },
    ])
    // ordered by effectiveAt desc: latest row ≤ shift date wins over current price
    mockPriceHistoryFindMany.mockResolvedValue([
      { productId: 1, price: 3, effectiveAt: new Date("2026-06-30") },
      { productId: 1, price: 2, effectiveAt: new Date("2026-06-01") },
    ])

    const total = await getShopSalesTotalFromShiftStock(1)
    expect(total).toBe(9)
  })

  it("returns 0 when no stock rows", async () => {
    mockFindMany.mockResolvedValue([])
    const total = await getShopSalesTotalFromShiftStock(99)
    expect(total).toBe(0)
  })
})
