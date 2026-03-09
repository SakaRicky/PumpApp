import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockShiftFindUnique = vi.fn()
const mockPumpFindUnique = vi.fn()
const mockPumpReadingFindMany = vi.fn()
const mockPumpReadingFindFirst = vi.fn()
const mockPumpReadingCreate = vi.fn()

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
        recordedById: 1,
        recordedAt: new Date("2025-01-01T00:00:00.000Z"),
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
      volume: 20,
    })
  })
})

