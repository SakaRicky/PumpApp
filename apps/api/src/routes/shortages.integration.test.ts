import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockWorkerFindUnique = vi.fn()
const mockSettlementCreate = vi.fn()
const mockEventCreate = vi.fn()
const mockSettingUpsert = vi.fn()
const mockSettingFindMany = vi.fn()

const txClient = {
  shortageSettlement: {
    create: (...args: unknown[]) => mockSettlementCreate(...args),
  },
  setting: {
    upsert: (...args: unknown[]) => mockSettingUpsert(...args),
  },
  event: {
    create: (...args: unknown[]) => mockEventCreate(...args),
  },
}

vi.mock("../db.js", () => ({
  prisma: {
    worker: {
      findUnique: (...args: unknown[]) => mockWorkerFindUnique(...args),
    },
    setting: {
      findMany: (...args: unknown[]) => mockSettingFindMany(...args),
    },
    $transaction: (arg: unknown) =>
      Array.isArray(arg)
        ? Promise.all(arg as Promise<unknown>[])
        : (arg as (tx: unknown) => Promise<unknown>)(txClient),
  },
}))

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

describe("Shortage settlements & settings API (integration)", () => {
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

  it("POST /api/shortages/settlements creates and journals a settlement", async () => {
    mockWorkerFindUnique.mockResolvedValue({ id: 3, name: "Alice" })
    mockSettlementCreate.mockResolvedValue({
      id: 7,
      workerId: 3,
      date: new Date("2026-07-03T00:00:00.000Z"),
      amount: { toNumber: () => 5000 },
      notes: "retenue",
      recordedById: 1,
      createdAt: new Date("2026-07-03T10:00:00.000Z"),
    })

    const res = await request(app)
      .post("/api/shortages/settlements")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ workerId: 3, date: "2026-07-03", amount: 5000, notes: "retenue" })
      .expect(201)

    expect(res.body).toMatchObject({ id: 7, workerId: 3, amount: 5000 })
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "SHORTAGE_SETTLED",
          workerId: 3,
          entityId: 7,
        }),
      })
    )
  })

  it("POST /api/shortages/settlements rejects non-positive amounts", async () => {
    await request(app)
      .post("/api/shortages/settlements")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ workerId: 3, date: "2026-07-03", amount: -5 })
      .expect(400)
    expect(mockSettlementCreate).not.toHaveBeenCalled()
  })

  it("PUT /api/settings/:key upserts and journals", async () => {
    mockSettingUpsert.mockResolvedValue({
      key: "station.timezone",
      value: "Africa/Douala",
      updatedAt: new Date("2026-07-03T10:00:00.000Z"),
    })

    const res = await request(app)
      .put("/api/settings/station.timezone")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ value: "Africa/Douala" })
      .expect(200)

    expect(res.body).toMatchObject({
      key: "station.timezone",
      value: "Africa/Douala",
    })
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "SETTING_UPDATED" }),
      })
    )
  })

  it("GET /api/settings requires admin", async () => {
    await request(app)
      .get("/api/settings")
      .set("Authorization", "Bearer not-admin")
      .expect(403)
    expect(mockSettingFindMany).not.toHaveBeenCalled()
  })
})
