import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const USER_TOKEN = "user-token"

const mockShiftFindMany = vi.fn()
const mockShiftFindFirst = vi.fn()
const mockTankFindMany = vi.fn()
const mockSummaryFindMany = vi.fn()
const mockCashAggregate = vi.fn()
const mockSummaryAggregate = vi.fn()
const mockExpenseAggregate = vi.fn()
const mockDepositAggregate = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    shift: {
      findMany: (...args: unknown[]) => mockShiftFindMany(...args),
      findFirst: (...args: unknown[]) => mockShiftFindFirst(...args),
    },
    tank: {
      findMany: (...args: unknown[]) => mockTankFindMany(...args),
    },
    shiftReconciliationSummary: {
      findMany: (...args: unknown[]) => mockSummaryFindMany(...args),
      aggregate: (...args: unknown[]) => mockSummaryAggregate(...args),
    },
    cashHandIn: {
      aggregate: (...args: unknown[]) => mockCashAggregate(...args),
    },
    expense: {
      aggregate: (...args: unknown[]) => mockExpenseAggregate(...args),
    },
    cashDeposit: {
      aggregate: (...args: unknown[]) => mockDepositAggregate(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

describe("Dashboard API (integration)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockVerify.mockReturnValue({ id: 2, role: "USER" })
    mockShiftFindFirst.mockResolvedValue(null)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("GET /api/dashboard requires auth", async () => {
    await request(app).get("/api/dashboard").expect(401)
  })

  it("GET /api/dashboard returns pending queue with aging, tanks and discrepancies", async () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    mockShiftFindMany.mockImplementation(
      (args: { where?: { status?: string | { in?: string[] } } }) => {
        if (args?.where?.status === "CLOSED") {
          return Promise.resolve([
            {
              id: 5,
              date: threeDaysAgo,
              startTime: threeDaysAgo,
              endTime: threeDaysAgo,
              status: "CLOSED",
            },
          ])
        }
        if (
          typeof args?.where?.status === "object" &&
          args.where.status.in?.includes("OPEN")
        ) {
          return Promise.resolve([
            {
              id: 6,
              date: yesterday,
              startTime: yesterday,
              endTime: yesterday,
              status: "OPEN",
            },
          ])
        }
        // "today" query — no shifts today
        return Promise.resolve([])
      }
    )
    mockTankFindMany.mockResolvedValue([
      {
        id: 1,
        name: "Cuve A",
        capacity: 10000,
        theoreticalQuantity: 4000,
        actualQuantity: 3950,
        actualQuantityRecordedAt: new Date("2026-07-01T08:00:00.000Z"),
        active: true,
        fuelType: { name: "Gasoil" },
      },
    ])
    mockSummaryFindMany.mockResolvedValue([
      {
        shiftId: 4,
        discrepancyAmount: { toNumber: () => 1500 },
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
        shift: { date: new Date("2026-07-01T00:00:00.000Z") },
      },
    ])
    mockSummaryAggregate.mockResolvedValue({
      _sum: { cashHandedTotal: 100000 },
    })
    mockExpenseAggregate.mockResolvedValue({ _sum: { amount: 15000 } })
    mockDepositAggregate.mockResolvedValue({ _sum: { amount: 60000 } })

    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .expect(200)

    expect(res.body.pendingReconciliations).toHaveLength(1)
    expect(res.body.pendingReconciliations[0]).toMatchObject({
      shiftId: 5,
      status: "CLOSED",
      ageDays: 3,
    })
    expect(res.body.staleOpenShifts[0]).toMatchObject({
      shiftId: 6,
      status: "OPEN",
      ageDays: 1,
    })

    expect(res.body.today).toMatchObject({
      shiftsTotal: 0,
      shiftsReconciled: 0,
      currentShiftId: null,
      currentShiftStatus: null,
      fuelVolume: 0,
      shopRevenue: 0,
      cashHandedIn: 0,
      expenses: 15000,
    })

    expect(res.body.safeBalance).toEqual({
      cashCollected: 100000,
      expensesTotal: 15000,
      depositsTotal: 60000,
      balance: 25000,
    })

    expect(res.body.tanks[0]).toMatchObject({
      id: 1,
      name: "Cuve A",
      fuelTypeName: "Gasoil",
      capacity: 10000,
      theoreticalQuantity: 4000,
      actualQuantity: 3950,
      varianceQuantity: -50,
    })

    expect(res.body.recentDiscrepancies[0]).toMatchObject({
      shiftId: 4,
      discrepancyAmount: 1500,
    })
  })
})
