import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const mockFindUnique = vi.fn()
vi.mock("../db.js", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

const mockCompare = vi.fn()
vi.mock("bcrypt", () => ({
  default: {
    compare: (...args: unknown[]) => mockCompare(...args),
  },
}))

const mockSign = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (...args: unknown[]) => mockSign(...args),
  },
}))

describe("POST /api/auth/login (integration)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "integration-secret" }
    mockSign.mockReturnValue("integration-jwt-token")
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns 200 with token and user for valid credentials", async () => {
    const user = {
      id: 10,
      name: "Integration User",
      email: "int@test.com",
      passwordHash: "hashed",
      role: "USER" as const,
      userType: "SYSTEM_USER" as const,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockFindUnique.mockResolvedValue(user)
    mockCompare.mockResolvedValue(true)

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "int@test.com", password: "pass" })
      .expect(200)

    expect(res.body).toHaveProperty("token", "integration-jwt-token")
    expect(res.body).toHaveProperty("user")
    expect(res.body.user).toEqual({
      id: 10,
      name: "Integration User",
      role: "USER",
    })
  })

  it("returns 401 for invalid credentials (user not found)", async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "nobody@test.com", password: "any" })
      .expect(401)

    expect(res.body).toMatchObject({
      error: "Invalid credentials",
    })
  })

  it("returns 401 for wrong password", async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      name: "U",
      email: "u@t.com",
      passwordHash: "hash",
      role: "ADMIN",
      userType: "SYSTEM_USER",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockCompare.mockResolvedValue(false)

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "u@t.com", password: "wrong" })
      .expect(401)

    expect(res.body.error).toBe("Invalid credentials")
  })

  it("returns 400 when body is missing username", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "secret" })
      .expect(400)

    expect(res.body).toMatchObject({
      error: "Validation failed",
    })
  })

  it("returns 400 when body is empty", async () => {
    const res = await request(app).post("/api/auth/login").send({}).expect(400)

    expect(res.body.error).toBe("Validation failed")
  })

  it("returns 500 when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET
    mockFindUnique.mockResolvedValue({
      id: 1,
      name: "U",
      email: "u@t.com",
      passwordHash: "hash",
      role: "ADMIN",
      userType: "SYSTEM_USER",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockCompare.mockResolvedValue(true)

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "u@t.com", password: "secret" })
      .expect(500)

    expect(res.body.error).toBe("Server misconfiguration")
  })

  it("login route is public (no Authorization required)", async () => {
    mockFindUnique.mockResolvedValue(null)
    await request(app)
      .post("/api/auth/login")
      .send({ username: "a@b.com", password: "p" })
      .expect(401)
  })
})
