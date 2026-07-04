import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockShiftFindFirst = vi.fn()
const mockShiftFindUnique = vi.fn()
const mockShiftCreate = vi.fn()
const mockWorkerFindMany = vi.fn()
const mockPumpFindMany = vi.fn()
const mockPumpFindUnique = vi.fn()
const mockSettingFindUnique = vi.fn()
const mockShiftWorkerCreateMany = vi.fn()
const mockAssignmentCreateMany = vi.fn()
const mockEventCreate = vi.fn()
const mockPumpReadingFindMany = vi.fn()

const txClient = {
  shift: {
    create: (...args: unknown[]) => mockShiftCreate(...args),
  },
  shiftWorker: {
    createMany: (...args: unknown[]) => mockShiftWorkerCreateMany(...args),
  },
  shiftPumpAssignment: {
    createMany: (...args: unknown[]) => mockAssignmentCreateMany(...args),
  },
  event: {
    create: (...args: unknown[]) => mockEventCreate(...args),
  },
}

vi.mock("../db.js", () => ({
  prisma: {
    shift: {
      findFirst: (...args: unknown[]) => mockShiftFindFirst(...args),
      findUnique: (...args: unknown[]) => mockShiftFindUnique(...args),
    },
    worker: {
      findMany: (...args: unknown[]) => mockWorkerFindMany(...args),
    },
    pump: {
      findMany: (...args: unknown[]) => mockPumpFindMany(...args),
      findUnique: (...args: unknown[]) => mockPumpFindUnique(...args),
    },
    setting: {
      findUnique: (...args: unknown[]) => mockSettingFindUnique(...args),
    },
    pumpReading: {
      findMany: (...args: unknown[]) => mockPumpReadingFindMany(...args),
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

describe("Shift quick-open & reading prefill (integration)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockVerify.mockImplementation((token: string) => {
      if (token === ADMIN_TOKEN) return { id: 1, role: "ADMIN" }
      return { id: 2, role: "USER" }
    })
    mockSettingFindUnique.mockResolvedValue(null)
    mockPumpFindUnique.mockResolvedValue({ tank: { capacity: 10000 } })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("POST /api/shifts/quick-open copies workers and pump assignments from the last shift", async () => {
    // 1st findFirst: today conflict check → none; 2nd: previous shift
    mockShiftFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 9,
        shopAccountableWorkerId: 2,
        workers: [
          { shiftId: 9, workerId: 1 },
          { shiftId: 9, workerId: 2 },
          { shiftId: 9, workerId: 3 }, // inactive → dropped
        ],
        pumpAssignments: [
          { shiftId: 9, pumpId: 1, workerId: 1 },
          { shiftId: 9, pumpId: 2, workerId: 3 }, // inactive worker → dropped
        ],
      })
    mockWorkerFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }])
    mockPumpFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }])
    mockShiftCreate.mockResolvedValue({
      id: 10,
      date: new Date("2026-07-03T00:00:00.000Z"),
      startTime: new Date("2026-07-03T08:00:00.000Z"),
      endTime: new Date("2026-07-03T17:00:00.000Z"),
      status: "OPEN",
      notes: null,
      shopAccountableWorkerId: 2,
    })

    const res = await request(app)
      .post("/api/shifts/quick-open")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(201)

    expect(res.body).toMatchObject({ id: 10, status: "OPEN" })
    expect(mockShiftCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "OPEN",
          shopAccountableWorkerId: 2,
        }),
      })
    )
    expect(mockShiftWorkerCreateMany).toHaveBeenCalledWith({
      data: [
        { shiftId: 10, workerId: 1 },
        { shiftId: 10, workerId: 2 },
      ],
    })
    expect(mockAssignmentCreateMany).toHaveBeenCalledWith({
      data: [{ shiftId: 10, pumpId: 1, workerId: 1 }],
    })
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "SHIFT_CREATED",
          payload: expect.objectContaining({
            quickOpen: true,
            copiedFromShiftId: 9,
          }),
        }),
      })
    )
  })

  it("POST /api/shifts/quick-open is a 409 when today already has an open shift", async () => {
    mockShiftFindFirst.mockResolvedValueOnce({ id: 5, status: "OPEN" })

    await request(app)
      .post("/api/shifts/quick-open")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(409)

    expect(mockShiftCreate).not.toHaveBeenCalled()
  })

  it("GET /api/shifts/:id/pump-readings/prefill returns each pump's last closing", async () => {
    mockShiftFindUnique.mockResolvedValue({
      id: 10,
      startTime: new Date("2026-07-03T08:00:00.000Z"),
    })
    mockPumpReadingFindMany.mockResolvedValue([
      {
        pumpId: 1,
        openingReading: 1000,
        closingReading: 1200,
        shift: { startTime: new Date("2026-07-01T08:00:00.000Z") },
      },
      {
        pumpId: 1,
        openingReading: 1200,
        closingReading: 1500,
        shift: { startTime: new Date("2026-07-02T08:00:00.000Z") },
      },
      {
        pumpId: 2,
        openingReading: 700,
        closingReading: 800,
        shift: { startTime: new Date("2026-07-02T08:00:00.000Z") },
      },
    ])

    const res = await request(app)
      .get("/api/shifts/10/pump-readings/prefill")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    const byPump = new Map(
      (
        res.body as Array<{
          pumpId: number
          lastClosingReading: number
          recentAverageVolume: number
          volumeCeiling: number
        }>
      ).map((r) => [r.pumpId, r.lastClosingReading])
    )
    expect(byPump.get(1)).toBe(1500)
    expect(byPump.get(2)).toBe(800)
    expect(res.body[0]).toHaveProperty("recentAverageVolume")
    expect(res.body[0]).toHaveProperty("volumeCeiling", 10000)
  })
})
