import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockUserFindMany = vi.fn()
const mockUserFindUnique = vi.fn()
const mockUserCreate = vi.fn()
const mockUserUpdate = vi.fn()
const mockWorkerFindUnique = vi.fn()
const mockWorkerFindMany = vi.fn()
const mockWorkerCreate = vi.fn()
const mockWorkerUpdate = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    worker: {
      findMany: (...args: unknown[]) => mockWorkerFindMany(...args),
      findUnique: (...args: unknown[]) => mockWorkerFindUnique(...args),
      create: (...args: unknown[]) => mockWorkerCreate(...args),
      update: (...args: unknown[]) => mockWorkerUpdate(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

const mockHash = vi.fn()
vi.mock("bcrypt", () => ({
  default: {
    hash: (...args: unknown[]) => mockHash(...args),
  },
}))

const userWithWorker = () => ({
  id: 1,
  workerId: 10,
  name: "Test User",
  email: "u@test.com",
  passwordHash: "hashed",
  role: "ADMIN",
  userType: "SYSTEM_USER",
  active: true,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-02T00:00:00.000Z"),
  worker: {
    id: 10,
    name: "Worker One",
    designation: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
})

describe("Users API (integration)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockVerify.mockImplementation((token: string) => {
      if (token === ADMIN_TOKEN) return { id: 1, role: "ADMIN" }
      throw new Error("invalid token")
    })
    mockHash.mockResolvedValue("hashed")
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("GET /api/users returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/users").expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockUserFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/users returns 403 with non-admin token", async () => {
    mockVerify.mockReturnValue({ id: 1, role: "USER" })

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer any-token")
      .expect(403)

    expect(res.body).toMatchObject({ error: "Forbidden" })
    expect(mockUserFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/users returns 200 and UserResponse array with admin token", async () => {
    const user = userWithWorker()
    mockUserFindMany.mockResolvedValue([user])

    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      id: 1,
      workerId: 10,
      name: "Test User",
      email: "u@test.com",
      role: "ADMIN",
      active: true,
      worker: { id: 10, name: "Worker One" },
    })
    expect(res.body[0]).not.toHaveProperty("passwordHash")
    expect(res.body[0]).toHaveProperty("createdAt")
    expect(res.body[0]).toHaveProperty("updatedAt")
  })

  it("POST /api/users returns 201 and UserResponse with valid body and admin token", async () => {
    mockWorkerFindUnique.mockResolvedValue({
      id: 10,
      name: "W",
      designation: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: null,
    })
    const created = userWithWorker()
    mockUserCreate.mockResolvedValue(created)

    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        workerId: 10,
        name: "Test User",
        email: "u@test.com",
        password: "secret",
        role: "ADMIN",
      })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 1,
      workerId: 10,
      name: "Test User",
      email: "u@test.com",
      role: "ADMIN",
      active: true,
    })
    expect(res.body).not.toHaveProperty("passwordHash")
  })

  it("PATCH /api/users/:id returns 200 and UserResponse with valid body and admin token", async () => {
    const existing = userWithWorker()
    mockUserFindUnique.mockResolvedValue(existing)
    const updated = userWithWorker()
    updated.name = "Updated Name"
    mockUserUpdate.mockResolvedValue(updated)

    const res = await request(app)
      .patch("/api/users/1")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Updated Name" })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 1,
      name: "Updated Name",
    })
  })

  it("POST /api/users returns 400 when workerId is missing", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: "U",
        email: "u@t.com",
        password: "p",
        role: "USER",
      })
      .expect(400)

    expect(res.body).toMatchObject({ error: "Validation failed" })
    expect(mockWorkerFindUnique).not.toHaveBeenCalled()
  })

  it("PATCH /api/users/:id returns 400 when id is invalid", async () => {
    const res = await request(app)
      .patch("/api/users/x")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "U" })
      .expect(400)

    expect(res.body).toMatchObject({ error: "Invalid user id" })
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it("PATCH /api/users/999 returns 404 when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null)

    const res = await request(app)
      .patch("/api/users/999")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "U" })
      .expect(404)

    expect(res.body).toMatchObject({ error: "User not found" })
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })
})
