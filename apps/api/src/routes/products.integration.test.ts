import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"
const USER_TOKEN = "user-token"

const mockProductFindMany = vi.fn()
const mockProductFindUnique = vi.fn()
const mockProductCreate = vi.fn()
const mockProductUpdate = vi.fn()
const mockCategoryFindUnique = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    product: {
      findMany: (...args: unknown[]) => mockProductFindMany(...args),
      findUnique: (...args: unknown[]) => mockProductFindUnique(...args),
      create: (...args: unknown[]) => mockProductCreate(...args),
      update: (...args: unknown[]) => mockProductUpdate(...args),
    },
    category: {
      findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

const productRow = (overrides?: {
  id?: number
  name?: string
  categoryId?: number
  sellingPrice?: number
  currentStock?: number
  active?: boolean
  category?: { id: number; name: string }
}) => ({
  id: 1,
  name: "Cola",
  categoryId: 10,
  sellingPrice: 2.5,
  currentStock: 100,
  active: true,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-02T00:00:00.000Z"),
  category: { id: 10, name: "Beverages" },
  ...overrides,
})

describe("Products API (integration)", () => {
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

  it("GET /api/products returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/products").expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockProductFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/products returns 200 and ProductResponse array with category", async () => {
    const prod = productRow()
    mockProductFindMany.mockResolvedValue([prod])

    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      id: 1,
      name: "Cola",
      categoryId: 10,
      sellingPrice: 2.5,
      currentStock: 100,
      active: true,
      category: { id: 10, name: "Beverages" },
    })
    expect(res.body[0]).toHaveProperty("createdAt")
    expect(res.body[0]).toHaveProperty("updatedAt")
  })

  it("GET /api/products uses include category and orderBy name", async () => {
    mockProductFindMany.mockResolvedValue([])

    await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(mockProductFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { category: true },
        orderBy: { name: "asc" },
      })
    )
  })

  it("POST /api/products returns 401 without Authorization", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({
        name: "New",
        categoryId: 1,
        sellingPrice: 1,
      })
      .expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockProductCreate).not.toHaveBeenCalled()
  })

  it("POST /api/products returns 403 with non-admin token", async () => {
    mockVerify.mockReturnValue({ id: 2, role: "USER" })

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", "Bearer any-token")
      .send({
        name: "New",
        categoryId: 1,
        sellingPrice: 1,
      })
      .expect(403)

    expect(res.body).toMatchObject({ error: "Forbidden" })
    expect(mockProductCreate).not.toHaveBeenCalled()
  })

  it("POST /api/products returns 201 and ProductResponse with valid body and admin token", async () => {
    mockCategoryFindUnique.mockResolvedValue({
      id: 10,
      name: "Beverages",
      description: null,
    })
    const created = productRow({
      name: "New Product",
      currentStock: 0,
      sellingPrice: 3,
    })
    mockProductCreate.mockResolvedValue(created)

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: "New Product",
        categoryId: 10,
        sellingPrice: 3,
      })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 1,
      name: "New Product",
      categoryId: 10,
      sellingPrice: 3,
      currentStock: 0,
      active: true,
      category: { id: 10, name: "Beverages" },
    })
    expect(mockProductCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "New Product",
          categoryId: 10,
          sellingPrice: 3,
          currentStock: 0,
          active: true,
        }),
      })
    )
  })

  it("POST /api/products returns 400 when categoryId does not exist", async () => {
    mockCategoryFindUnique.mockResolvedValue(null)

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        name: "New",
        categoryId: 999,
        sellingPrice: 1,
      })
      .expect(400)

    expect(res.body).toMatchObject({ error: "Category not found" })
    expect(mockProductCreate).not.toHaveBeenCalled()
  })

  it("POST /api/products returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        categoryId: 1,
        sellingPrice: 1,
      })
      .expect(400)

    expect(res.body).toMatchObject({ error: "Validation failed" })
    expect(mockCategoryFindUnique).not.toHaveBeenCalled()
  })

  it("PATCH /api/products/:id returns 200 and ProductResponse with valid body and admin token", async () => {
    const existing = productRow()
    mockProductFindUnique.mockResolvedValue(existing)
    const updated = productRow({ name: "Updated Name" })
    mockProductUpdate.mockResolvedValue(updated)

    const res = await request(app)
      .patch("/api/products/1")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "Updated Name" })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 1,
      name: "Updated Name",
      categoryId: 10,
    })
  })

  it("PATCH /api/products/:id returns 400 when id is invalid", async () => {
    const res = await request(app)
      .patch("/api/products/x")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "U" })
      .expect(400)
    expect(res.body).toMatchObject({ error: "Invalid product id" })
    expect(mockProductFindUnique).not.toHaveBeenCalled()
  })

  it("PATCH /api/products/999 returns 404 when product not found", async () => {
    mockProductFindUnique.mockResolvedValue(null)

    const res = await request(app)
      .patch("/api/products/999")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ name: "U" })
      .expect(404)

    expect(res.body).toMatchObject({ error: "Product not found" })
    expect(mockProductUpdate).not.toHaveBeenCalled()
  })

  it("PATCH /api/products/:id returns 400 when categoryId in body does not exist", async () => {
    const existing = productRow()
    mockProductFindUnique.mockResolvedValue(existing)
    mockCategoryFindUnique.mockResolvedValue(null)

    const res = await request(app)
      .patch("/api/products/1")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ categoryId: 999 })
      .expect(400)

    expect(res.body).toMatchObject({ error: "Category not found" })
    expect(mockProductUpdate).not.toHaveBeenCalled()
  })
})
