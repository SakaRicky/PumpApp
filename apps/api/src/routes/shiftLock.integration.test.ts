import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockShiftFindUnique = vi.fn()
const mockPumpReadingCreate = vi.fn()
const mockCashHandInCreate = vi.fn()
const mockStockUpsert = vi.fn()
const mockEventCreate = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    shift: {
      findUnique: (...args: unknown[]) => mockShiftFindUnique(...args),
    },
    pumpReading: {
      create: (...args: unknown[]) => mockPumpReadingCreate(...args),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    cashHandIn: {
      create: (...args: unknown[]) => mockCashHandInCreate(...args),
    },
    shiftProductStock: {
      upsert: (...args: unknown[]) => mockStockUpsert(...args),
    },
    event: {
      create: (...args: unknown[]) => mockEventCreate(...args),
    },
    $transaction: (arg: unknown) =>
      Array.isArray(arg)
        ? Promise.all(arg as Promise<unknown>[])
        : Promise.resolve(),
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

describe("Reconciled shifts are locked at the API layer", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockVerify.mockImplementation((token: string) => {
      if (token === ADMIN_TOKEN) return { id: 1, role: "ADMIN" }
      return { id: 2, role: "USER" }
    })
    mockShiftFindUnique.mockResolvedValue({
      id: 1,
      status: "RECONCILED",
      date: new Date("2026-07-01"),
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("rejects new pump readings on a RECONCILED shift with 409", async () => {
    const res = await request(app)
      .post("/api/shifts/1/pump-readings")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ pumpId: 1, openingReading: 100, closingReading: 120 })
      .expect(409)

    expect(res.body.error).toMatch(/locked/i)
    expect(mockPumpReadingCreate).not.toHaveBeenCalled()
  })

  it("rejects new cash hand-ins on a RECONCILED shift with 409", async () => {
    const res = await request(app)
      .post("/api/shifts/1/cash-handins")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ workerId: 1, amount: 1000 })
      .expect(409)

    expect(res.body.error).toMatch(/locked/i)
    expect(mockCashHandInCreate).not.toHaveBeenCalled()
  })

  it("rejects stock upserts on a RECONCILED shift with 409", async () => {
    const res = await request(app)
      .put("/api/shifts/1/stock")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send([{ productId: 1, openingQty: 5, closingQty: 2 }])
      .expect(409)

    expect(res.body.error).toMatch(/locked/i)
    expect(mockStockUpsert).not.toHaveBeenCalled()
  })
})
