import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockFuelTypeFindMany = vi.fn()
const mockFuelTypeFindUnique = vi.fn()
const mockFuelTypeCreate = vi.fn()
const mockFuelTypeUpdate = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    fuelType: {
      findMany: (...args: unknown[]) => mockFuelTypeFindMany(...args),
      findUnique: (...args: unknown[]) => mockFuelTypeFindUnique(...args),
      create: (...args: unknown[]) => mockFuelTypeCreate(...args),
      update: (...args: unknown[]) => mockFuelTypeUpdate(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

describe("Fuel types API (integration)", () => {
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

  it("GET /api/fuel-types returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/fuel-types").expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockFuelTypeFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/fuel-types returns 200 with token", async () => {
    mockFuelTypeFindMany.mockResolvedValue([
      {
        id: 1,
        name: "Diesel",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    const res = await request(app)
      .get("/api/fuel-types")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({
      id: 1,
      name: "Diesel",
      active: true,
    })
  })

  it("POST /api/fuel-types requires admin", async () => {
    const res = await request(app)
      .post("/api/fuel-types")
      .set("Authorization", "Bearer not-admin")
      .send({ name: "Petrol" })
      .expect(403)

    expect(res.body.error).toBe("Forbidden")
    expect(mockFuelTypeCreate).not.toHaveBeenCalled()
  })

  it("POST /api/fuel-types creates fuel type with valid body and admin token", async () => {
    const created = {
      id: 2,
      name: "Petrol",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockFuelTypeCreate.mockResolvedValue(created)

    const res = await request(app)
      .post("/api/fuel-types")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Petrol" })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 2,
      name: "Petrol",
      active: true,
    })
  })

  it("PATCH /api/fuel-types/:id updates fuel type for admin", async () => {
    const existing = {
      id: 3,
      name: "Old",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const updated = {
      id: 3,
      name: "New",
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockFuelTypeFindUnique.mockResolvedValue(existing)
    mockFuelTypeUpdate.mockResolvedValue(updated)

    const res = await request(app)
      .patch("/api/fuel-types/3")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "New", active: false })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 3,
      name: "New",
      active: false,
    })
  })
})

