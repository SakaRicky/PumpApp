import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockFindMany = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockFindFirst = vi.fn()
const mockFuelTypeFindUnique = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    fuelPriceHistory: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findUnique: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    fuelType: {
      findUnique: (...args: unknown[]) => mockFuelTypeFindUnique(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

describe("Fuel prices API (integration)", () => {
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

  it("GET /api/fuel-prices requires auth", async () => {
    await request(app).get("/api/fuel-prices").expect(401)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/fuel-prices returns data for authed user", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 1,
        fuelTypeId: 1,
        pricePerUnit: 1.5,
        purchasePricePerUnit: null,
        effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
        effectiveTo: null,
      },
    ])

    const res = await request(app)
      .get("/api/fuel-prices")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(res.body[0]).toMatchObject({
      id: 1,
      fuelTypeId: 1,
      pricePerUnit: 1.5,
    })
  })

  it("POST /api/fuel-prices requires admin", async () => {
    const res = await request(app)
      .post("/api/fuel-prices")
      .set("Authorization", "Bearer not-admin")
      .send({ fuelTypeId: 1, pricePerUnit: 1.5, effectiveFrom: "2025-01-01" })
      .expect(403)

    expect(res.body.error).toBe("Forbidden")
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("POST /api/fuel-prices creates record with admin token", async () => {
    mockFuelTypeFindUnique.mockResolvedValue({
      id: 1,
      name: "Diesel",
      active: true,
    })
    mockFindMany.mockResolvedValue([])
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      id: 1,
      fuelTypeId: 1,
      pricePerUnit: 1.5,
      purchasePricePerUnit: null,
      effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
      effectiveTo: null,
    })

    const res = await request(app)
      .post("/api/fuel-prices")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ fuelTypeId: 1, pricePerUnit: 1.5, effectiveFrom: "2025-01-01" })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 1,
      fuelTypeId: 1,
      pricePerUnit: 1.5,
    })
  })
})
