import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"
const USER_TOKEN = "user-token"

const mockCategoryFindMany = vi.fn()
const mockCategoryFindUnique = vi.fn()
const mockCategoryCreate = vi.fn()
const mockCategoryUpdate = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    category: {
      findMany: (...args: unknown[]) => mockCategoryFindMany(...args),
      findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args),
      create: (...args: unknown[]) => mockCategoryCreate(...args),
      update: (...args: unknown[]) => mockCategoryUpdate(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

const categoryRow = (overrides?: {
  id?: number
  name?: string
  description?: string | null
}) => ({
  id: 1,
  name: "Beverages",
  description: "Drinks and similar",
  ...overrides,
})

describe("Categories API (integration)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockVerify.mockImplementation((token: string) => {
      if (token === ADMIN_TOKEN) return { id: 1, role: "ADMIN" }
      if (token === USER_TOKEN) return { id: 2, role: "USER" }
      throw new Error("invalid token")
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("GET /api/categories returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/categories").expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockCategoryFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/categories returns 200 and CategoryResponse array with any valid token", async () => {
    const cat = categoryRow()
    mockCategoryFindMany.mockResolvedValue([cat])

    const res = await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      id: 1,
      name: "Beverages",
      description: "Drinks and similar",
    })
  })

  it("GET /api/categories returns categories ordered by name", async () => {
    mockCategoryFindMany.mockResolvedValue([
      categoryRow({ id: 2, name: "Snacks" }),
      categoryRow({ id: 1, name: "Beverages" }),
    ])

    await request(app)
      .get("/api/categories")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(mockCategoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: "asc" } })
    )
  })

  it("POST /api/categories returns 401 without Authorization", async () => {
    const res = await request(app)
      .post("/api/categories")
      .send({ name: "New Cat" })
      .expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockCategoryCreate).not.toHaveBeenCalled()
  })

  it("POST /api/categories returns 403 with non-admin token", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .send({ name: "New Cat" })
      .expect(403)
    expect(res.body).toMatchObject({ error: "Forbidden" })
    expect(mockCategoryCreate).not.toHaveBeenCalled()
  })

  it("POST /api/categories returns 201 and CategoryResponse with valid body and admin token", async () => {
    const created = categoryRow({ name: "New Cat", description: "Desc" })
    mockCategoryCreate.mockResolvedValue(created)

    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "New Cat", description: "Desc" })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 1,
      name: "New Cat",
      description: "Desc",
    })
    expect(mockCategoryCreate).toHaveBeenCalledWith({
      data: { name: "New Cat", description: "Desc" },
    })
  })

  it("POST /api/categories returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ description: "Only desc" })
      .expect(400)
    expect(res.body).toMatchObject({ error: "Validation failed" })
    expect(mockCategoryCreate).not.toHaveBeenCalled()
  })

  it("PATCH /api/categories/:id returns 200 and CategoryResponse with valid body and admin token", async () => {
    const existing = categoryRow()
    mockCategoryFindUnique.mockResolvedValue(existing)
    const updated = categoryRow({ name: "Updated Name" })
    mockCategoryUpdate.mockResolvedValue(updated)

    const res = await request(app)
      .patch("/api/categories/1")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Updated Name" })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 1,
      name: "Updated Name",
      description: "Drinks and similar",
    })
  })

  it("PATCH /api/categories/:id returns 400 when id is invalid", async () => {
    const res = await request(app)
      .patch("/api/categories/x")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "U" })
      .expect(400)
    expect(res.body).toMatchObject({ error: "Invalid category id" })
    expect(mockCategoryFindUnique).not.toHaveBeenCalled()
  })

  it("PATCH /api/categories/999 returns 404 when category not found", async () => {
    mockCategoryFindUnique.mockResolvedValue(null)

    const res = await request(app)
      .patch("/api/categories/999")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "U" })
      .expect(404)
    expect(res.body).toMatchObject({ error: "Category not found" })
    expect(mockCategoryUpdate).not.toHaveBeenCalled()
  })
})
