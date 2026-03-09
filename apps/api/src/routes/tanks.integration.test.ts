import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockTankFindMany = vi.fn()
const mockTankFindUnique = vi.fn()
const mockTankCreate = vi.fn()
const mockTankUpdate = vi.fn()
const mockFuelTypeFindUnique = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    tank: {
      findMany: (...args: unknown[]) => mockTankFindMany(...args),
      findUnique: (...args: unknown[]) => mockTankFindUnique(...args),
      create: (...args: unknown[]) => mockTankCreate(...args),
      update: (...args: unknown[]) => mockTankUpdate(...args),
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

describe("Tanks API (integration)", () => {
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

  it("GET /api/tanks returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/tanks").expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockTankFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/tanks returns 200 with token", async () => {
    const now = new Date()
    mockTankFindMany.mockResolvedValue([
      {
        id: 1,
        fuelTypeId: 1,
        name: "Tank 1",
        capacity: null,
        theoreticalQuantity: null,
        actualQuantity: null,
        actualQuantityRecordedAt: null,
        active: true,
        createdAt: now,
        updatedAt: now,
        fuelType: { id: 1, name: "Diesel", active: true, createdAt: now, updatedAt: now },
      },
    ])

    const res = await request(app)
      .get("/api/tanks")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({
      id: 1,
      name: "Tank 1",
      fuelTypeId: 1,
      fuelTypeName: "Diesel",
    })
  })

  it("POST /api/tanks requires admin", async () => {
    const res = await request(app)
      .post("/api/tanks")
      .set("Authorization", "Bearer not-admin")
      .send({ name: "Tank 1", fuelTypeId: 1 })
      .expect(403)

    expect(res.body.error).toBe("Forbidden")
    expect(mockTankCreate).not.toHaveBeenCalled()
  })

  it("POST /api/tanks creates tank with valid body and admin token", async () => {
    const now = new Date()
    mockFuelTypeFindUnique.mockResolvedValue({
      id: 1,
      name: "Diesel",
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    const created = {
      id: 2,
      fuelTypeId: 1,
      name: "Tank 2",
      capacity: null,
      theoreticalQuantity: null,
      actualQuantity: null,
      actualQuantityRecordedAt: null,
      active: true,
      createdAt: now,
      updatedAt: now,
      fuelType: { id: 1, name: "Diesel", active: true, createdAt: now, updatedAt: now },
    }
    mockTankCreate.mockResolvedValue(created)

    const res = await request(app)
      .post("/api/tanks")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Tank 2", fuelTypeId: 1 })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 2,
      name: "Tank 2",
      fuelTypeId: 1,
      active: true,
    })
  })

  it("PATCH /api/tanks/:id updates tank for admin", async () => {
    const now = new Date()
    const existing = {
      id: 3,
      fuelTypeId: 1,
      name: "Old tank",
      capacity: null,
      theoreticalQuantity: null,
      actualQuantity: null,
      actualQuantityRecordedAt: null,
      active: true,
      createdAt: now,
      updatedAt: now,
      fuelType: { id: 1, name: "Diesel", active: true, createdAt: now, updatedAt: now },
    }
    const updated = {
      ...existing,
      name: "New tank",
      active: false,
    }
    mockTankFindUnique.mockResolvedValue(existing)
    mockFuelTypeFindUnique.mockResolvedValue({
      id: 1,
      name: "Diesel",
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    mockTankUpdate.mockResolvedValue(updated)

    const res = await request(app)
      .patch("/api/tanks/3")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "New tank", active: false })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 3,
      name: "New tank",
      active: false,
    })
  })
})

