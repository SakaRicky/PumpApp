import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockTankFindUnique = vi.fn()
const mockTankLevelReadingFindMany = vi.fn()
const mockTankLevelReadingFindFirst = vi.fn()
const mockTankLevelReadingCreate = vi.fn()
const mockTankLevelReadingUpdate = vi.fn()
const mockTankUpdate = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    tank: {
      findUnique: (...args: unknown[]) => mockTankFindUnique(...args),
      update: (...args: unknown[]) => mockTankUpdate(...args),
    },
    tankLevelReading: {
      findMany: (...args: unknown[]) => mockTankLevelReadingFindMany(...args),
      findFirst: (...args: unknown[]) => mockTankLevelReadingFindFirst(...args),
      create: (...args: unknown[]) => mockTankLevelReadingCreate(...args),
      update: (...args: unknown[]) => mockTankLevelReadingUpdate(...args),
    },
    $transaction: (arg: unknown) =>
      Array.isArray(arg)
        ? Promise.all(arg as Promise<unknown>[])
        : typeof arg === "function"
          ? (arg as (tx: unknown) => Promise<unknown>)({
              tankLevelReading: {
                findFirst: (...args: unknown[]) =>
                  mockTankLevelReadingFindFirst(...args),
                update: (...args: unknown[]) =>
                  mockTankLevelReadingUpdate(...args),
              },
              tank: {
                update: (...args: unknown[]) => mockTankUpdate(...args),
              },
            })
          : Promise.resolve(),
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

describe("Tank level readings API (integration)", () => {
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

  it("GET /api/tanks/:tankId/level-readings returns 401 without Authorization", async () => {
    const res = await request(app)
      .get("/api/tanks/1/level-readings")
      .expect(401)
    expect(res.body).toMatchObject({ error: expect.any(String) })
    expect(mockTankFindUnique).not.toHaveBeenCalled()
  })

  it("GET /api/tanks/:tankId/level-readings returns 404 when tank not found", async () => {
    mockTankFindUnique.mockResolvedValue(null)

    const res = await request(app)
      .get("/api/tanks/99/level-readings")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(404)

    expect(res.body.error).toBe("Tank not found")
  })

  it("GET /api/tanks/:tankId/level-readings returns readings for tank", async () => {
    const now = new Date()
    const tank = {
      id: 1,
      fuelTypeId: 1,
      name: "Tank A",
      theoreticalQuantity: 5000,
      actualQuantity: 4800,
      actualQuantityRecordedAt: now,
      capacity: 10000,
      active: true,
      createdAt: now,
      updatedAt: now,
    }
    mockTankFindUnique.mockResolvedValue(tank)
    mockTankLevelReadingFindMany.mockResolvedValue([
      {
        id: 1,
        tankId: 1,
        measuredAt: now,
        quantity: 4800,
        theoreticalQuantityAtTime: 5000,
        createdAt: now,
      },
    ])

    const res = await request(app)
      .get("/api/tanks/1/level-readings")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toMatchObject({
      id: 1,
      tankId: 1,
      quantity: 4800,
      theoreticalQuantityAtTime: 5000,
    })
  })

  it("POST /api/tanks/:tankId/level-readings requires admin", async () => {
    const res = await request(app)
      .post("/api/tanks/1/level-readings")
      .set("Authorization", "Bearer not-admin")
      .send({ quantity: 1000 })
      .expect(403)

    expect(res.body.error).toBe("Forbidden")
    expect(mockTankLevelReadingCreate).not.toHaveBeenCalled()
  })

  it("POST /api/tanks/:tankId/level-readings creates reading and updates tank", async () => {
    const now = new Date()
    const tank = {
      id: 1,
      fuelTypeId: 1,
      name: "Tank A",
      theoreticalQuantity: 5000,
      actualQuantity: null,
      actualQuantityRecordedAt: null,
      capacity: 10000,
      active: true,
      createdAt: now,
      updatedAt: now,
    }
    const createdReading = {
      id: 1,
      tankId: 1,
      measuredAt: now,
      quantity: 4800,
      theoreticalQuantityAtTime: 5000,
      createdAt: now,
    }

    mockTankFindUnique.mockResolvedValue(tank)
    mockTankLevelReadingCreate.mockResolvedValue(createdReading)
    mockTankUpdate.mockResolvedValue({
      ...tank,
      actualQuantity: 4800,
      actualQuantityRecordedAt: now,
    })

    const res = await request(app)
      .post("/api/tanks/1/level-readings")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ quantity: 4800 })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 1,
      tankId: 1,
      quantity: 4800,
      theoreticalQuantityAtTime: 5000,
    })
    expect(mockTankLevelReadingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tankId: 1,
          quantity: 4800,
          theoreticalQuantityAtTime: 5000,
        }),
      })
    )
    expect(mockTankUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        actualQuantity: 4800,
        actualQuantityRecordedAt: expect.any(Date),
      },
    })
  })

  it("PATCH /api/tanks/:tankId/level-readings/:id updates reading and syncs tank if latest", async () => {
    const now = new Date()
    const existingReading = {
      id: 1,
      tankId: 1,
      measuredAt: now,
      quantity: 4800,
      theoreticalQuantityAtTime: 5000,
      createdAt: now,
    }
    const updatedReading = {
      ...existingReading,
      quantity: 4900,
      measuredAt: now,
    }
    mockTankLevelReadingFindFirst
      .mockResolvedValueOnce(existingReading)
      .mockResolvedValueOnce(updatedReading)
    mockTankLevelReadingUpdate.mockResolvedValue(updatedReading)
    mockTankUpdate.mockResolvedValue({})

    const res = await request(app)
      .patch("/api/tanks/1/level-readings/1")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ quantity: 4900 })
      .expect(200)

    expect(res.body).toMatchObject({
      id: 1,
      tankId: 1,
      quantity: 4900,
    })
    expect(mockTankLevelReadingUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { quantity: 4900, measuredAt: expect.any(Date) },
    })
    expect(mockTankUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        actualQuantity: 4900,
        actualQuantityRecordedAt: expect.any(Date),
      },
    })
  })
})
