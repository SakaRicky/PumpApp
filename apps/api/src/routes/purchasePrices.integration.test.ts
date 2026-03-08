import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"
const USER_TOKEN = "user-token"

const mockProductFindUnique = vi.fn()
const mockProductFindMany = vi.fn()
const mockProductCreate = vi.fn()
const mockProductUpdate = vi.fn()
const mockCategoryFindUnique = vi.fn()
const mockPurchasePriceFindMany = vi.fn()
const mockPurchasePriceFindFirst = vi.fn()
const mockPurchasePriceCreate = vi.fn()

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
    purchasePriceHistory: {
      findMany: (...args: unknown[]) => mockPurchasePriceFindMany(...args),
      findFirst: (...args: unknown[]) => mockPurchasePriceFindFirst(...args),
      create: (...args: unknown[]) => mockPurchasePriceCreate(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

const priceRow = (overrides?: {
  id?: number
  productId?: number
  purchasePrice?: number
  effectiveAt?: Date
  notes?: string | null
}) => ({
  id: 1,
  productId: 1,
  purchasePrice: 10,
  effectiveAt: new Date("2025-01-01T00:00:00.000Z"),
  notes: null,
  ...overrides,
})

describe("Purchase price history API (integration)", () => {
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

  it("GET /api/products/:productId/purchase-prices returns 401 without Authorization", async () => {
    const res = await request(app)
      .get("/api/products/1/purchase-prices")
      .expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockProductFindUnique).not.toHaveBeenCalled()
  })

  it("GET /api/products/:productId/purchase-prices returns 404 when product missing", async () => {
    mockProductFindUnique.mockResolvedValue(null)

    const res = await request(app)
      .get("/api/products/999/purchase-prices")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .expect(404)

    expect(res.body).toMatchObject({ error: "Product not found" })
    expect(mockPurchasePriceFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/products/:productId/purchase-prices returns 400 when productId invalid", async () => {
    const res = await request(app)
      .get("/api/products/not-a-number/purchase-prices")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .expect(400)
    expect(res.body).toMatchObject({ error: "Invalid product id" })
  })

  it("GET /api/products/:productId/purchase-prices returns 200 and array ordered by effectiveAt desc", async () => {
    mockProductFindUnique.mockResolvedValue({ id: 1, name: "Cola" })
    const rows = [
      priceRow({
        id: 2,
        purchasePrice: 12,
        effectiveAt: new Date("2025-02-01"),
      }),
      priceRow({
        id: 1,
        purchasePrice: 10,
        effectiveAt: new Date("2025-01-01"),
      }),
    ]
    mockPurchasePriceFindMany.mockResolvedValue(rows)

    const res = await request(app)
      .get("/api/products/1/purchase-prices")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({
      id: 2,
      productId: 1,
      purchasePrice: 12,
      notes: null,
    })
    expect(res.body[0].effectiveAt).toBe(new Date("2025-02-01").toISOString())
    expect(mockPurchasePriceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 1 },
        orderBy: { effectiveAt: "desc" },
      })
    )
  })

  it("POST /api/products/:productId/purchase-prices returns 401 without Authorization", async () => {
    const res = await request(app)
      .post("/api/products/1/purchase-prices")
      .send({
        purchasePrice: 10,
        effectiveAt: "2025-01-01T00:00:00.000Z",
      })
      .expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockPurchasePriceCreate).not.toHaveBeenCalled()
  })

  it("POST /api/products/:productId/purchase-prices returns 403 with non-admin token", async () => {
    mockVerify.mockReturnValue({ id: 2, role: "USER" })

    const res = await request(app)
      .post("/api/products/1/purchase-prices")
      .set("Authorization", "Bearer any-token")
      .send({
        purchasePrice: 10,
        effectiveAt: "2025-01-01T00:00:00.000Z",
      })
      .expect(403)
    expect(res.body).toMatchObject({ error: "Forbidden" })
    expect(mockPurchasePriceCreate).not.toHaveBeenCalled()
  })

  it("POST /api/products/:productId/purchase-prices returns 404 when product missing", async () => {
    mockProductFindUnique.mockResolvedValue(null)

    const res = await request(app)
      .post("/api/products/999/purchase-prices")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        purchasePrice: 10,
        effectiveAt: "2025-01-01T00:00:00.000Z",
      })
      .expect(404)
    expect(res.body).toMatchObject({ error: "Product not found" })
    expect(mockPurchasePriceCreate).not.toHaveBeenCalled()
  })

  it("POST first price returns 201 without alert", async () => {
    mockProductFindUnique.mockResolvedValue({ id: 1, name: "Cola" })
    mockPurchasePriceFindFirst.mockResolvedValue(null)
    const created = priceRow({ id: 1, purchasePrice: 10 })
    mockPurchasePriceCreate.mockResolvedValue(created)

    const res = await request(app)
      .post("/api/products/1/purchase-prices")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        purchasePrice: 10,
        effectiveAt: "2025-01-01T00:00:00.000Z",
      })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 1,
      productId: 1,
      purchasePrice: 10,
      effectiveAt: "2025-01-01T00:00:00.000Z",
      notes: null,
    })
    expect(res.body.alert).toBeUndefined()
  })

  it("POST higher price returns 201 with alert true", async () => {
    mockProductFindUnique.mockResolvedValue({ id: 1, name: "Cola" })
    mockPurchasePriceFindFirst.mockResolvedValue(
      priceRow({ id: 1, purchasePrice: 10 })
    )
    const created = priceRow({ id: 2, purchasePrice: 15 })
    mockPurchasePriceCreate.mockResolvedValue(created)

    const res = await request(app)
      .post("/api/products/1/purchase-prices")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        purchasePrice: 15,
        effectiveAt: "2025-02-01T00:00:00.000Z",
      })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 2,
      productId: 1,
      purchasePrice: 15,
      alert: true,
    })
  })

  it("POST lower price returns 201 without alert", async () => {
    mockProductFindUnique.mockResolvedValue({ id: 1, name: "Cola" })
    mockPurchasePriceFindFirst.mockResolvedValue(
      priceRow({ id: 1, purchasePrice: 15 })
    )
    const created = priceRow({ id: 3, purchasePrice: 12 })
    mockPurchasePriceCreate.mockResolvedValue(created)

    const res = await request(app)
      .post("/api/products/1/purchase-prices")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        purchasePrice: 12,
        effectiveAt: "2025-03-01T00:00:00.000Z",
      })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 3,
      purchasePrice: 12,
    })
    expect(res.body.alert).toBeUndefined()
  })

  it("POST returns 400 when purchasePrice missing", async () => {
    mockProductFindUnique.mockResolvedValue({ id: 1, name: "Cola" })

    const res = await request(app)
      .post("/api/products/1/purchase-prices")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        effectiveAt: "2025-01-01T00:00:00.000Z",
      })
      .expect(400)
    expect(res.body).toMatchObject({ error: "Validation failed" })
    expect(mockPurchasePriceCreate).not.toHaveBeenCalled()
  })

  it("price history preservation: POST two prices then GET returns both", async () => {
    mockProductFindUnique.mockResolvedValue({ id: 1, name: "Cola" })
    mockPurchasePriceFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(priceRow({ id: 1, purchasePrice: 10 }))
    mockPurchasePriceCreate
      .mockResolvedValueOnce(priceRow({ id: 1, purchasePrice: 10 }))
      .mockResolvedValueOnce(priceRow({ id: 2, purchasePrice: 12 }))

    await request(app)
      .post("/api/products/1/purchase-prices")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        purchasePrice: 10,
        effectiveAt: "2025-01-01T00:00:00.000Z",
      })
      .expect(201)

    await request(app)
      .post("/api/products/1/purchase-prices")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        purchasePrice: 12,
        effectiveAt: "2025-02-01T00:00:00.000Z",
      })
      .expect(201)

    expect(mockPurchasePriceCreate).toHaveBeenCalledTimes(2)
    mockPurchasePriceFindMany.mockResolvedValue([
      priceRow({
        id: 2,
        purchasePrice: 12,
        effectiveAt: new Date("2025-02-01"),
      }),
      priceRow({
        id: 1,
        purchasePrice: 10,
        effectiveAt: new Date("2025-01-01"),
      }),
    ])

    const listRes = await request(app)
      .get("/api/products/1/purchase-prices")
      .set("Authorization", `Bearer ${USER_TOKEN}`)
      .expect(200)

    expect(listRes.body).toHaveLength(2)
    expect(listRes.body[0].purchasePrice).toBe(12)
    expect(listRes.body[1].purchasePrice).toBe(10)
  })
})
