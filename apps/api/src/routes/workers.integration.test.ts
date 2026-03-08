import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockUserFindMany = vi.fn()
const mockUserFindUnique = vi.fn()
const mockUserCreate = vi.fn()
const mockUserUpdate = vi.fn()
const mockWorkerFindMany = vi.fn()
const mockWorkerFindUnique = vi.fn()
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

const makeWorker = () => ({
  id: 1,
  name: "Worker One",
  designation: "Pumpist",
  active: true,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-02T00:00:00.000Z"),
})

describe("Workers API (integration)", () => {
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

  it("GET /api/workers returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/workers").expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockWorkerFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/workers returns 403 with non-admin token", async () => {
    mockVerify.mockReturnValue({ id: 1, role: "USER" })

    const res = await request(app)
      .get("/api/workers")
      .set("Authorization", "Bearer any-token")
      .expect(403)

    expect(res.body).toMatchObject({ error: "Forbidden" })
    expect(mockWorkerFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/workers returns 200 and WorkerResponse array with admin token", async () => {
    const worker = makeWorker()
    mockWorkerFindMany.mockResolvedValue([worker])

    const res = await request(app)
      .get("/api/workers")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      id: 1,
      name: "Worker One",
      designation: "Pumpist",
      active: true,
    })
    expect(res.body[0]).toHaveProperty("createdAt")
    expect(res.body[0]).toHaveProperty("updatedAt")
  })

  it("POST /api/workers returns 201 and WorkerResponse with valid body and admin token", async () => {
    const created = makeWorker()
    mockWorkerCreate.mockResolvedValue(created)

    const res = await request(app)
      .post("/api/workers")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Worker One", designation: "Pumpist" })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 1,
      name: "Worker One",
      designation: "Pumpist",
      active: true,
    })
  })

  it("PATCH /api/workers/:id returns 200 and WorkerResponse with valid body and admin token", async () => {
    const existing = makeWorker()
    mockWorkerFindUnique.mockResolvedValue(existing)
    const updated = makeWorker()
    updated.name = "Updated Name"
    mockWorkerUpdate.mockResolvedValue(updated)

    const res = await request(app)
      .patch("/api/workers/1")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Updated Name" })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 1,
      name: "Updated Name",
    })
  })

  it("POST /api/workers returns 400 when name is empty", async () => {
    const res = await request(app)
      .post("/api/workers")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "" })
      .expect(400)

    expect(res.body).toMatchObject({ error: "Validation failed" })
    expect(mockWorkerCreate).not.toHaveBeenCalled()
  })

  it("PATCH /api/workers/:id returns 400 when id is invalid", async () => {
    const res = await request(app)
      .patch("/api/workers/x")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "U" })
      .expect(400)

    expect(res.body).toMatchObject({ error: "Invalid worker id" })
    expect(mockWorkerFindUnique).not.toHaveBeenCalled()
  })

  it("PATCH /api/workers/999 returns 404 when worker not found", async () => {
    mockWorkerFindUnique.mockResolvedValue(null)

    const res = await request(app)
      .patch("/api/workers/999")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "U" })
      .expect(404)

    expect(res.body).toMatchObject({ error: "Worker not found" })
    expect(mockWorkerUpdate).not.toHaveBeenCalled()
  })
})
