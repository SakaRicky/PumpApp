import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockShiftFindMany = vi.fn()
const mockPumpReadingFindMany = vi.fn()
const mockCashGroupBy = vi.fn()
const mockStockGroupBy = vi.fn()
const mockTankFindUnique = vi.fn()
const mockLevelReadingFindMany = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    shift: {
      findMany: (...args: unknown[]) => mockShiftFindMany(...args),
    },
    pumpReading: {
      findMany: (...args: unknown[]) => mockPumpReadingFindMany(...args),
    },
    cashHandIn: {
      groupBy: (...args: unknown[]) => mockCashGroupBy(...args),
    },
    shiftProductStock: {
      groupBy: (...args: unknown[]) => mockStockGroupBy(...args),
    },
    tank: {
      findUnique: (...args: unknown[]) => mockTankFindUnique(...args),
    },
    tankLevelReading: {
      findMany: (...args: unknown[]) => mockLevelReadingFindMany(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

const reconciledShift = {
  id: 1,
  date: new Date("2026-07-01T00:00:00.000Z"),
  startTime: new Date("2026-07-01T06:00:00.000Z"),
  endTime: new Date("2026-07-01T14:00:00.000Z"),
  status: "RECONCILED",
  reconciliation: {
    fuelSalesTotal: { toNumber: () => 120000 },
    effectiveShopSalesTotal: { toNumber: () => 30000 },
    cashHandedTotal: { toNumber: () => 145000 },
    discrepancyAmount: { toNumber: () => 5000 },
  },
}

describe("Reports API (integration)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockVerify.mockImplementation((token: string) => {
      if (token === ADMIN_TOKEN) return { id: 1, role: "ADMIN" }
      return { id: 2, role: "USER" }
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("GET /api/reports/shifts requires admin", async () => {
    await request(app)
      .get("/api/reports/shifts")
      .set("Authorization", "Bearer not-admin")
      .expect(403)
  })

  it("GET /api/reports/shifts returns rows built from summaries", async () => {
    mockShiftFindMany.mockResolvedValue([reconciledShift])
    mockPumpReadingFindMany.mockResolvedValue([
      { shiftId: 1, openingReading: 100, closingReading: 300 },
    ])
    mockCashGroupBy.mockResolvedValue([
      { shiftId: 1, _sum: { amount: 145000 } },
    ])
    mockStockGroupBy.mockResolvedValue([])

    const res = await request(app)
      .get("/api/reports/shifts?from=2026-07-01&to=2026-07-02")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      shiftId: 1,
      reconciled: true,
      fuelVolume: 200,
      fuelRevenue: 120000,
      shopRevenue: 30000,
      cashHandedIn: 145000,
      discrepancy: 5000,
    })
  })

  it("GET /api/reports/shifts?format=csv returns CSV", async () => {
    mockShiftFindMany.mockResolvedValue([reconciledShift])
    mockPumpReadingFindMany.mockResolvedValue([])
    mockCashGroupBy.mockResolvedValue([])
    mockStockGroupBy.mockResolvedValue([])

    const res = await request(app)
      .get("/api/reports/shifts?format=csv")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(res.headers["content-type"]).toContain("text/csv")
    const lines = res.text.split("\n")
    expect(lines[0]).toBe(
      "shiftId,date,status,reconciled,fuelVolume,fuelRevenue,shopRevenue,cashHandedIn,discrepancy"
    )
    expect(lines[1]).toContain("1,2026-07-01,RECONCILED,true")
  })

  it("GET /api/reports/daily aggregates shifts by date", async () => {
    mockShiftFindMany.mockResolvedValue([
      reconciledShift,
      {
        ...reconciledShift,
        id: 2,
        startTime: new Date("2026-07-01T14:00:00.000Z"),
        endTime: new Date("2026-07-01T22:00:00.000Z"),
      },
    ])
    mockPumpReadingFindMany.mockResolvedValue([
      { shiftId: 1, openingReading: 0, closingReading: 100 },
      { shiftId: 2, openingReading: 100, closingReading: 250 },
    ])
    mockCashGroupBy.mockResolvedValue([])
    mockStockGroupBy.mockResolvedValue([])

    const res = await request(app)
      .get("/api/reports/daily")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      date: "2026-07-01",
      shiftsTotal: 2,
      shiftsReconciled: 2,
      fuelVolume: 250,
      fuelRevenue: 240000,
      discrepancy: 10000,
    })
  })

  it("GET /api/reports/tank-variance computes cumulative variance and verdicts", async () => {
    mockTankFindUnique.mockResolvedValue({
      id: 1,
      name: "Cuve A",
      capacity: 10000,
      dipToleranceLiters: 30,
      dipTolerancePct: null,
      fuelType: { name: "Gasoil" },
    })
    mockLevelReadingFindMany.mockResolvedValue([
      {
        id: 1,
        measuredAt: new Date("2026-06-01T08:00:00.000Z"),
        quantity: 4980,
        theoreticalQuantityAtTime: 5000,
      },
      {
        id: 2,
        measuredAt: new Date("2026-06-02T08:00:00.000Z"),
        quantity: 3950,
        theoreticalQuantityAtTime: 4000,
      },
    ])

    const res = await request(app)
      .get("/api/reports/tank-variance?tankId=1")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(res.body.tankName).toBe("Cuve A")
    expect(res.body.rows).toHaveLength(2)
    expect(res.body.rows[0]).toMatchObject({
      variance: -20,
      cumulativeVariance: -20,
      withinTolerance: true,
    })
    expect(res.body.rows[1]).toMatchObject({
      variance: -50,
      cumulativeVariance: -70,
      withinTolerance: false,
    })
  })

  it("GET /api/reports/tank-variance without tankId is a 400", async () => {
    await request(app)
      .get("/api/reports/tank-variance")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(400)
  })
})
