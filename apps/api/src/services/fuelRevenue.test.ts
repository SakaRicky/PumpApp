import { describe, it, expect, vi } from "vitest"
import { getVolumeAndRevenueForShift } from "./fuelRevenue.js"

const mockShiftFindUnique = vi.fn()
const mockPumpReadingFindMany = vi.fn()
const mockGetPriceForShift = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    shift: {
      findUnique: (...args: unknown[]) => mockShiftFindUnique(...args),
    },
    pumpReading: {
      findMany: (...args: unknown[]) => mockPumpReadingFindMany(...args),
    },
  },
}))

vi.mock("../controllers/fuelPriceHistoryController.js", () => ({
  getPriceForShift: (...args: unknown[]) => mockGetPriceForShift(...args),
}))

describe("getVolumeAndRevenueForShift", () => {
  it("computes per-pump and total revenue", async () => {
    mockShiftFindUnique.mockResolvedValue({
      id: 1,
      date: new Date("2025-01-15T00:00:00.000Z"),
    })
    mockPumpReadingFindMany.mockResolvedValue([
      {
        id: 1,
        pumpId: 1,
        shiftId: 1,
        openingReading: 100,
        closingReading: 150,
        recordedById: 1,
        recordedAt: new Date("2025-01-15T10:00:00.000Z"),
      },
      {
        id: 2,
        pumpId: 2,
        shiftId: 1,
        openingReading: 200,
        closingReading: 260,
        recordedById: 1,
        recordedAt: new Date("2025-01-15T10:05:00.000Z"),
      },
    ])
    mockGetPriceForShift.mockResolvedValueOnce({
      id: 1,
      pumpId: 1,
      pricePerUnit: 1.5,
      effectiveFrom: "2025-01-01T00:00:00.000Z",
      effectiveTo: null,
    })
    mockGetPriceForShift.mockResolvedValueOnce({
      id: 2,
      pumpId: 2,
      pricePerUnit: 2,
      effectiveFrom: "2025-01-01T00:00:00.000Z",
      effectiveTo: null,
    })

    const result = await getVolumeAndRevenueForShift(1)

    expect(result.totalVolume).toBe(110)
    expect(result.totalRevenue).toBeCloseTo(1.5 * 50 + 2 * 60)
    expect(result.perPump).toHaveLength(2)
  })
})

