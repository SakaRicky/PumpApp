import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockFuelDeliveryFindMany = vi.fn()
const mockFuelDeliveryCreate = vi.fn()
const mockFuelDeliveryFindUnique = vi.fn()
const mockTankFindUnique = vi.fn()
const mockTankUpdate = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    fuelDelivery: {
      findMany: (...args: unknown[]) => mockFuelDeliveryFindMany(...args),
      create: (...args: unknown[]) => mockFuelDeliveryCreate(...args),
      findUnique: (...args: unknown[]) => mockFuelDeliveryFindUnique(...args),
    },
    tank: {
      findUnique: (...args: unknown[]) => mockTankFindUnique(...args),
      update: (...args: unknown[]) => mockTankUpdate(...args),
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

describe("Fuel deliveries API (integration)", () => {
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

  it("GET /api/fuel-deliveries returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/fuel-deliveries").expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockFuelDeliveryFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/fuel-deliveries returns 200 with token", async () => {
    const now = new Date()
    mockFuelDeliveryFindMany.mockResolvedValue([
      {
        id: 1,
        tankId: 1,
        quantity: 500,
        deliveredAt: now,
        notes: "Note",
        createdAt: now,
        updatedAt: now,
        tank: {
          name: "Tank A",
          fuelType: { name: "Diesel" },
        },
      },
    ])

    const res = await request(app)
      .get("/api/fuel-deliveries")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({
      id: 1,
      tankId: 1,
      quantity: 500,
      tankName: "Tank A",
      fuelTypeName: "Diesel",
    })
  })

  it("POST /api/tanks/:tankId/deliveries requires admin", async () => {
    const res = await request(app)
      .post("/api/tanks/1/deliveries")
      .set("Authorization", "Bearer not-admin")
      .send({ quantity: 100 })
      .expect(403)

    expect(res.body.error).toBe("Forbidden")
    expect(mockTankFindUnique).not.toHaveBeenCalled()
  })

  it("POST /api/tanks/:tankId/deliveries creates delivery and updates tank", async () => {
    const now = new Date()
    const tank = {
      id: 1,
      fuelTypeId: 1,
      name: "Tank A",
      capacity: 5000,
      theoreticalQuantity: 1000,
      actualQuantity: null,
      actualQuantityRecordedAt: null,
      active: true,
      createdAt: now,
      updatedAt: now,
      fuelType: {
        id: 1,
        name: "Diesel",
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    }
    const createdDelivery = {
      id: 1,
      tankId: 1,
      quantity: 200,
      deliveredAt: now,
      notes: null,
      createdAt: now,
      updatedAt: now,
    }
    const deliveryWithTank = {
      ...createdDelivery,
      tank: { name: "Tank A", fuelType: { name: "Diesel" } },
    }

    mockTankFindUnique.mockResolvedValue(tank)
    mockFuelDeliveryCreate.mockResolvedValue(createdDelivery)
    mockTankUpdate.mockResolvedValue({ ...tank, theoreticalQuantity: 1200 })
    mockFuelDeliveryFindUnique.mockResolvedValue(deliveryWithTank)

    const res = await request(app)
      .post("/api/tanks/1/deliveries")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ quantity: 200 })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 1,
      tankId: 1,
      quantity: 200,
      tankName: "Tank A",
      fuelTypeName: "Diesel",
    })
    expect(mockTankUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { theoreticalQuantity: 1200 },
      })
    )
  })
})
