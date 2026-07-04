import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockShiftFindUnique = vi.fn()
const mockPumpFindMany = vi.fn()
const mockPumpReadingFindMany = vi.fn()
const mockStockFindMany = vi.fn()
const mockTankFindMany = vi.fn()
const mockDipFindMany = vi.fn()
const mockSellingPriceFindMany = vi.fn()
const mockFuelPriceFindMany = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    shift: {
      findUnique: (...args: unknown[]) => mockShiftFindUnique(...args),
    },
    pump: {
      findMany: (...args: unknown[]) => mockPumpFindMany(...args),
    },
    pumpReading: {
      findMany: (...args: unknown[]) => mockPumpReadingFindMany(...args),
    },
    shiftProductStock: {
      findMany: (...args: unknown[]) => mockStockFindMany(...args),
    },
    tank: {
      findMany: (...args: unknown[]) => mockTankFindMany(...args),
    },
    tankLevelReading: {
      findMany: (...args: unknown[]) => mockDipFindMany(...args),
    },
    sellingPriceHistory: {
      findMany: (...args: unknown[]) => mockSellingPriceFindMany(...args),
    },
    fuelPriceHistory: {
      findMany: (...args: unknown[]) => mockFuelPriceFindMany(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

const shift = {
  id: 5,
  date: new Date("2026-07-03T00:00:00.000Z"),
  startTime: new Date("2026-07-03T08:00:00.000Z"),
  endTime: new Date("2026-07-03T17:00:00.000Z"),
  status: "OPEN",
}

const pumpWithTank = {
  id: 1,
  name: "Pump 1",
  active: true,
  tank: { id: 1, fuelTypeId: 1 },
}

describe("Shift close-preview API (integration)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockVerify.mockImplementation((token: string) => {
      if (token === ADMIN_TOKEN) return { id: 1, role: "ADMIN" }
      return { id: 2, role: "USER" }
    })
    mockSellingPriceFindMany.mockResolvedValue([])
    mockDipFindMany.mockResolvedValue([])
    mockTankFindMany.mockResolvedValue([])
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("flags missing readings and missing dip; blocks negative sold lines", async () => {
    mockShiftFindUnique.mockResolvedValue(shift)
    mockPumpFindMany.mockResolvedValue([pumpWithTank])
    mockPumpReadingFindMany.mockResolvedValue([])
    mockStockFindMany.mockResolvedValue([
      {
        productId: 1,
        openingQty: 5,
        receivedQty: 0,
        closingQty: 9, // closing > opening+received → sold −4
        product: { name: "Cola", sellingPrice: 500 },
      },
    ])

    const res = await request(app)
      .get("/api/shifts/5/close-preview")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(res.body.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Missing pump reading"),
        expect.stringContaining("negative sold"),
      ])
    )
    expect(res.body.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("No tank dip")])
    )
    expect(res.body.shop.negativeLines).toHaveLength(1)
    expect(res.body.shop.negativeLines[0].sold).toBe(-4)
  })

  it("computes per-pump revenue and shop expected total on the happy path", async () => {
    mockShiftFindUnique.mockResolvedValue(shift)
    mockPumpFindMany.mockResolvedValue([pumpWithTank])
    mockPumpReadingFindMany.mockResolvedValue([
      { pumpId: 1, shiftId: 5, openingReading: 100, closingReading: 220 },
    ])
    mockStockFindMany.mockResolvedValue([
      {
        productId: 1,
        openingQty: 10,
        receivedQty: 2,
        closingQty: 7,
        product: { name: "Cola", sellingPrice: 500 },
      },
    ])
    // getPriceForShift scans fuelPriceHistory for a unique in-force row
    mockFuelPriceFindMany.mockResolvedValue([
      {
        id: 1,
        fuelTypeId: 1,
        pricePerUnit: 800,
        purchasePricePerUnit: null,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: null,
      },
    ])

    const res = await request(app)
      .get("/api/shifts/5/close-preview")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(res.body.blockers).toEqual([])
    expect(res.body.pumps[0]).toMatchObject({
      pumpId: 1,
      volume: 120,
      price: 800,
      revenue: 96000,
    })
    expect(res.body.fuelTotal).toMatchObject({ volume: 120, revenue: 96000 })
    // sold = 10 + 2 − 7 = 5 × 500
    expect(res.body.shop.expectedTotal).toBe(2500)
  })

  it("returns 404 for an unknown shift", async () => {
    mockShiftFindUnique.mockResolvedValue(null)
    await request(app)
      .get("/api/shifts/999/close-preview")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(404)
  })
})
