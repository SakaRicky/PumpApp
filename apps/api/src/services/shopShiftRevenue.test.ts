import { describe, expect, it, vi, beforeEach } from "vitest"
import { getShopSalesTotalFromShiftStock } from "./shopShiftRevenue.js"

const mockFindMany = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    shiftProductStock: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}))

describe("getShopSalesTotalFromShiftStock", () => {
  beforeEach(() => {
    mockFindMany.mockReset()
  })

  it("sums soldQty * sellingPrice per line", async () => {
    mockFindMany.mockResolvedValue([
      {
        openingQty: 10,
        receivedQty: 0,
        closingQty: 7,
        product: { sellingPrice: 2.5 },
      },
      {
        openingQty: 5,
        receivedQty: 0,
        closingQty: 5,
        product: { sellingPrice: 1 },
      },
    ])

    const total = await getShopSalesTotalFromShiftStock(1)
    expect(total).toBe(7.5)
  })

  it("returns 0 when no stock rows", async () => {
    mockFindMany.mockResolvedValue([])
    const total = await getShopSalesTotalFromShiftStock(99)
    expect(total).toBe(0)
  })
})
