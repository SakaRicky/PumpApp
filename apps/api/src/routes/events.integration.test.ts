import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockEventFindMany = vi.fn()
const mockEventCount = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    event: {
      findMany: (...args: unknown[]) => mockEventFindMany(...args),
      count: (...args: unknown[]) => mockEventCount(...args),
    },
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

describe("Events API (integration)", () => {
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

  it("GET /api/events requires admin", async () => {
    await request(app)
      .get("/api/events")
      .set("Authorization", "Bearer not-admin")
      .expect(403)
    expect(mockEventFindMany).not.toHaveBeenCalled()
  })

  it("GET /api/events returns items and total with filters applied", async () => {
    mockEventFindMany.mockResolvedValue([
      {
        id: 10,
        type: "CASH_HAND_IN_RECORDED",
        occurredAt: new Date("2026-07-01T10:00:00.000Z"),
        actorUserId: 1,
        workerId: 3,
        shiftId: 7,
        entity: "cashHandIn",
        entityId: 4,
        payload: { amount: 5000 },
        correctsEventId: null,
        notes: null,
      },
    ])
    mockEventCount.mockResolvedValue(1)

    const res = await request(app)
      .get("/api/events?shiftId=7&type=CASH_HAND_IN_RECORDED&limit=10")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(res.body.total).toBe(1)
    expect(res.body.items[0]).toMatchObject({
      id: 10,
      type: "CASH_HAND_IN_RECORDED",
      shiftId: 7,
      workerId: 3,
      payload: { amount: 5000 },
    })

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: "CASH_HAND_IN_RECORDED", shiftId: 7 },
        take: 10,
        skip: 0,
      })
    )
  })

  it("GET /api/events rejects an unknown type", async () => {
    await request(app)
      .get("/api/events?type=NOT_A_TYPE")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(400)
  })
})
