import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockPumpFindMany = vi.fn()
const mockPumpFindUnique = vi.fn()
const mockPumpCreate = vi.fn()
const mockPumpUpdate = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    pump: {
      findMany: (...args: unknown[]) => mockPumpFindMany(...args),
      findUnique: (...args: unknown[]) => mockPumpFindUnique(...args),
      create: (...args: unknown[]) => mockPumpCreate(...args),
      update: (...args: unknown[]) => mockPumpUpdate(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

describe("Pumps API (integration)", () => {
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

  it("GET /api/pumps returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/pumps").expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockPumpFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/pumps returns 200 with token", async () => {
    mockPumpFindMany.mockResolvedValue([
      { id: 1, name: "Pump 1", active: true },
    ])

    const res = await request(app)
      .get("/api/pumps")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({
      id: 1,
      name: "Pump 1",
      active: true,
    })
  })

  it("POST /api/pumps requires admin", async () => {
    const res = await request(app)
      .post("/api/pumps")
      .set("Authorization", "Bearer not-admin")
      .send({ name: "Pump X" })
      .expect(403)

    expect(res.body.error).toBe("Forbidden")
    expect(mockPumpCreate).not.toHaveBeenCalled()
  })

  it("POST /api/pumps creates pump with valid body and admin token", async () => {
    const created = { id: 2, name: "Pump 2", active: true }
    mockPumpCreate.mockResolvedValue(created)

    const res = await request(app)
      .post("/api/pumps")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Pump 2" })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 2,
      name: "Pump 2",
      active: true,
    })
  })

  it("PATCH /api/pumps/:id updates pump for admin", async () => {
    const existing = { id: 3, name: "Old Name", active: true }
    const updated = { id: 3, name: "New Name", active: false }
    mockPumpFindUnique.mockResolvedValue(existing)
    mockPumpUpdate.mockResolvedValue(updated)

    const res = await request(app)
      .patch("/api/pumps/3")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "New Name", active: false })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 3,
      name: "New Name",
      active: false,
    })
  })
})

