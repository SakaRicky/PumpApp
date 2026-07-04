import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockShiftFindUnique = vi.fn()
const mockPumpFindUnique = vi.fn()
const mockPumpReadingFindMany = vi.fn()
const mockPumpReadingFindFirst = vi.fn()
const mockPumpReadingCreate = vi.fn()
const mockShiftPumpAssignmentFindUnique = vi.fn()
const mockSettingFindUnique = vi.fn()
const mockTankFindUnique = vi.fn()
const mockTankUpdate = vi.fn()
const mockEventCreate = vi.fn()
const mockTransaction = vi.fn()

const txClient = {
  pumpReading: {
    create: (...args: unknown[]) => mockPumpReadingCreate(...args),
  },
  tank: {
    findUnique: (...args: unknown[]) => mockTankFindUnique(...args),
    update: (...args: unknown[]) => mockTankUpdate(...args),
  },
  event: {
    create: (...args: unknown[]) => mockEventCreate(...args),
  },
}

vi.mock("../db.js", () => ({
  prisma: {
    shift: {
      findUnique: (...args: unknown[]) => mockShiftFindUnique(...args),
    },
    pump: {
      findUnique: (...args: unknown[]) => mockPumpFindUnique(...args),
    },
    pumpReading: {
      findMany: (...args: unknown[]) => mockPumpReadingFindMany(...args),
      findFirst: (...args: unknown[]) => mockPumpReadingFindFirst(...args),
      create: (...args: unknown[]) => mockPumpReadingCreate(...args),
    },
    shiftPumpAssignment: {
      findUnique: (...args: unknown[]) =>
        mockShiftPumpAssignmentFindUnique(...args),
    },
    setting: {
      findUnique: (...args: unknown[]) => mockSettingFindUnique(...args),
    },
    tank: {
      findUnique: (...args: unknown[]) => mockTankFindUnique(...args),
      update: (...args: unknown[]) => mockTankUpdate(...args),
    },
    event: {
      create: (...args: unknown[]) => mockEventCreate(...args),
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

describe("Pump readings API (integration)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockVerify.mockImplementation((token: string) => {
      if (token === ADMIN_TOKEN) return { id: 1, role: "ADMIN" }
      return { id: 2, role: "USER" }
    })
    mockTransaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(txClient)
    )
    mockSettingFindUnique.mockResolvedValue(null)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("GET /api/shifts/:id/pump-readings requires admin", async () => {
    await request(app)
      .get("/api/shifts/1/pump-readings")
      .set("Authorization", "Bearer not-admin")
      .expect(403)
  })

  it("GET /api/shifts/:id/pump-readings returns readings for admin", async () => {
    mockPumpReadingFindMany.mockResolvedValue([
      {
        id: 1,
        pumpId: 1,
        shiftId: 1,
        openingReading: 100,
        closingReading: 120,
        workerId: 2,
        recordedById: 1,
        recordedAt: new Date("2025-01-01T00:00:00.000Z"),
        worker: { id: 2, name: "Alice" },
      },
    ])

    const res = await request(app)
      .get("/api/shifts/1/pump-readings")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(res.body[0]).toMatchObject({
      id: 1,
      pumpId: 1,
      shiftId: 1,
      openingReading: 100,
      closingReading: 120,
      workerId: 2,
      workerName: "Alice",
      volume: 20,
    })
  })

  it("POST /api/shifts/:id/pump-readings rejects volume above tank capacity", async () => {
    mockShiftFindUnique.mockResolvedValue({
      id: 1,
      status: "OPEN",
    })
    mockPumpFindUnique.mockResolvedValue({
      id: 1,
      active: true,
      tankId: 1,
      tank: { capacity: 100 },
    })
    mockPumpReadingFindFirst.mockResolvedValue(null)
    mockShiftPumpAssignmentFindUnique.mockResolvedValue({ workerId: 2 })

    const res = await request(app)
      .post("/api/shifts/1/pump-readings")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        pumpId: 1,
        openingReading: 1000,
        closingReading: 1201,
      })
      .expect(422)

    expect(res.body).toMatchObject({
      code: "VALIDATION_ERROR",
      details: { ceilingExceeded: true, volume: 201, ceiling: 100 },
    })
    expect(mockPumpReadingCreate).not.toHaveBeenCalled()
  })

  it("POST /api/shifts/:id/pump-readings allows admin override with reason and journals it", async () => {
    mockShiftFindUnique.mockResolvedValue({
      id: 1,
      status: "OPEN",
    })
    mockPumpFindUnique.mockResolvedValue({
      id: 1,
      active: true,
      tankId: 1,
      tank: { capacity: 100 },
    })
    mockPumpReadingFindFirst.mockResolvedValue(null)
    mockShiftPumpAssignmentFindUnique.mockResolvedValue({ workerId: 2 })
    mockTankFindUnique.mockResolvedValue({ theoreticalQuantity: 500 })
    mockPumpReadingCreate.mockResolvedValue({
      id: 9,
      pumpId: 1,
      shiftId: 1,
      openingReading: 1000,
      closingReading: 1201,
      workerId: 2,
      recordedById: 1,
      recordedAt: new Date("2026-07-01T00:00:00.000Z"),
      worker: { id: 2, name: "Alice" },
    })

    await request(app)
      .post("/api/shifts/1/pump-readings")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        pumpId: 1,
        openingReading: 1000,
        closingReading: 1201,
        overrideCeiling: true,
        overrideReason: "Meter replacement check",
      })
      .expect(201)

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({
            ceilingExceeded: true,
            ceiling: 100,
            overrideReason: "Meter replacement check",
          }),
        }),
      })
    )
  })
})
