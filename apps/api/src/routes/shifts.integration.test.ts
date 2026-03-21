import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockShiftFindMany = vi.fn()
const mockShiftCreate = vi.fn()
const mockShiftFindUnique = vi.fn()
const mockShiftUpdate = vi.fn()
const mockShiftWorkerFindMany = vi.fn()
const mockShiftProductStockCount = vi.fn()
const mockPumpReadingCount = vi.fn()
const mockProductUpdate = vi.fn()
const mockTransaction = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    shift: {
      findMany: (...args: unknown[]) => mockShiftFindMany(...args),
      create: (...args: unknown[]) => mockShiftCreate(...args),
      findUnique: (...args: unknown[]) => mockShiftFindUnique(...args),
      update: (...args: unknown[]) => mockShiftUpdate(...args),
    },
    shiftWorker: {
      findMany: (...args: unknown[]) => mockShiftWorkerFindMany(...args),
    },
    shiftProductStock: {
      count: (...args: unknown[]) => mockShiftProductStockCount(...args),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    pumpReading: {
      count: (...args: unknown[]) => mockPumpReadingCount(...args),
    },
    product: {
      update: (...args: unknown[]) => mockProductUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

describe("Shifts API (integration, basic rules)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockVerify.mockImplementation((token: string) => {
      if (token === ADMIN_TOKEN) return { id: 1, role: "ADMIN" }
      throw new Error("invalid token")
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("PATCH /api/shifts/:id prevents closing when no workers are assigned", async () => {
    const shiftId = 1
    mockShiftFindUnique.mockResolvedValue({
      id: shiftId,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      status: "PLANNED",
      notes: null,
    })
    mockShiftWorkerFindMany.mockResolvedValue([])

    const res = await request(app)
      .patch(`/api/shifts/${shiftId}`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ status: "CLOSED" })
      .expect(400)

    expect(res.body.error).toBe(
      "Shift must have at least one worker before closing"
    )
    expect(mockShiftProductStockCount).not.toHaveBeenCalled()
  })

  const saleShiftWorker = {
    shiftId: 2,
    workerId: 10,
    worker: {
      id: 10,
      name: "Shop Worker",
      designation: "Sale",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 100,
        workerId: 10,
        name: "Shop User",
        email: "shop@test.com",
        passwordHash: "x",
        role: "SALE",
        userType: "SYSTEM_USER",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  }

  const pumpShiftWorker = {
    shiftId: 2,
    workerId: 20,
    worker: {
      id: 20,
      name: "Pump Worker",
      designation: "Pump",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 200,
        workerId: 20,
        name: "Pump User",
        email: "pump@test.com",
        passwordHash: "x",
        role: "PUMPIST",
        userType: "SYSTEM_USER",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  }

  it("PATCH /api/shifts/:id prevents closing when only SALE worker (no PUMPIST)", async () => {
    const shiftId = 2
    mockShiftFindUnique.mockResolvedValue({
      id: shiftId,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      status: "OPEN",
      notes: null,
    })
    mockShiftWorkerFindMany.mockResolvedValue([saleShiftWorker])

    const res = await request(app)
      .patch(`/api/shifts/${shiftId}`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ status: "CLOSED" })
      .expect(400)

    expect(res.body.error).toBe(
      "Shift must include at least one assigned worker who covers fuel/pumps (e.g. designation “Pumpist”, or linked login with role PUMPIST) before closing"
    )
    expect(mockShiftProductStockCount).not.toHaveBeenCalled()
  })

  it("PATCH /api/shifts/:id prevents closing when only PUMPIST worker (no SALE)", async () => {
    const shiftId = 3
    mockShiftFindUnique.mockResolvedValue({
      id: shiftId,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      status: "OPEN",
      notes: null,
    })
    mockShiftWorkerFindMany.mockResolvedValue([{ ...pumpShiftWorker, shiftId }])

    const res = await request(app)
      .patch(`/api/shifts/${shiftId}`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ status: "CLOSED" })
      .expect(400)

    expect(res.body.error).toBe(
      "Shift must include at least one assigned worker who covers the shop (e.g. designation “Shop”, or linked login with role SALE) before closing"
    )
    expect(mockShiftProductStockCount).not.toHaveBeenCalled()
  })

  it("PATCH /api/shifts/:id prevents closing when workers ok but no pump readings (stock snapshot not required)", async () => {
    const shiftId = 4
    mockShiftFindUnique.mockResolvedValue({
      id: shiftId,
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      status: "PLANNED",
      notes: null,
    })
    mockShiftWorkerFindMany.mockResolvedValue([
      { ...saleShiftWorker, shiftId },
      { ...pumpShiftWorker, shiftId },
    ])
    mockPumpReadingCount.mockResolvedValue(0)

    const res = await request(app)
      .patch(`/api/shifts/${shiftId}`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ status: "CLOSED" })
      .expect(400)

    expect(res.body.error).toBe("Cannot close shift without pump readings")
    expect(mockShiftProductStockCount).not.toHaveBeenCalled()
    expect(mockPumpReadingCount).toHaveBeenCalled()
  })
})
