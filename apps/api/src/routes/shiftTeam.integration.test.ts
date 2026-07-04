import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockShiftFindUnique = vi.fn()
const mockShiftUpdate = vi.fn()
const mockWorkerFindMany = vi.fn()
const mockPumpFindMany = vi.fn()
const mockShiftWorkerFindMany = vi.fn()
const mockShiftWorkerCreateMany = vi.fn()
const mockShiftWorkerDeleteMany = vi.fn()
const mockAssignmentFindMany = vi.fn()
const mockAssignmentUpsert = vi.fn()
const mockAssignmentDeleteMany = vi.fn()
const mockReadingCount = vi.fn()
const mockHandInCount = vi.fn()
const mockEventCreate = vi.fn()

const txClient = {
  shift: {
    update: (...args: unknown[]) => mockShiftUpdate(...args),
  },
  shiftWorker: {
    createMany: (...args: unknown[]) => mockShiftWorkerCreateMany(...args),
    deleteMany: (...args: unknown[]) => mockShiftWorkerDeleteMany(...args),
  },
  shiftPumpAssignment: {
    upsert: (...args: unknown[]) => mockAssignmentUpsert(...args),
    deleteMany: (...args: unknown[]) => mockAssignmentDeleteMany(...args),
  },
  event: {
    create: (...args: unknown[]) => mockEventCreate(...args),
  },
}

vi.mock("../db.js", () => ({
  prisma: {
    shift: {
      findUnique: (...args: unknown[]) => mockShiftFindUnique(...args),
    },
    worker: {
      findMany: (...args: unknown[]) => mockWorkerFindMany(...args),
    },
    pump: {
      findMany: (...args: unknown[]) => mockPumpFindMany(...args),
    },
    shiftWorker: {
      findMany: (...args: unknown[]) => mockShiftWorkerFindMany(...args),
    },
    shiftPumpAssignment: {
      findMany: (...args: unknown[]) => mockAssignmentFindMany(...args),
    },
    pumpReading: {
      count: (...args: unknown[]) => mockReadingCount(...args),
    },
    cashHandIn: {
      count: (...args: unknown[]) => mockHandInCount(...args),
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

describe("Shift team API (integration)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockVerify.mockImplementation((token: string) => {
      if (token === ADMIN_TOKEN) return { id: 1, role: "ADMIN" }
      return { id: 2, role: "USER" }
    })
    mockShiftFindUnique.mockResolvedValue({
      id: 7,
      status: "OPEN",
      shopAccountableWorkerId: null,
    })
    mockReadingCount.mockResolvedValue(0)
    mockHandInCount.mockResolvedValue(0)
    mockAssignmentFindMany.mockResolvedValue([
      { shiftId: 7, pumpId: 1, workerId: 1 },
    ])
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("PUT /api/shifts/:id/team syncs workers, assignments and seller in one call", async () => {
    // worker 3 currently on shift but removed by the new team
    mockShiftWorkerFindMany.mockResolvedValue([
      { shiftId: 7, workerId: 1 },
      { shiftId: 7, workerId: 3 },
    ])
    // worker 2 auto-included because a pump references them
    mockWorkerFindMany.mockResolvedValue([
      { id: 1, name: "Alice", active: true },
      { id: 2, name: "Bob", active: true },
      { id: 4, name: "Carla", active: true },
    ])
    mockPumpFindMany.mockResolvedValue([{ id: 1, active: true }])

    const res = await request(app)
      .put("/api/shifts/7/team")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        workerIds: [1],
        pumpAssignments: [{ pumpId: 1, workerId: 2 }],
        shopAccountableWorkerId: 4,
      })
      .expect(200)

    expect(res.body.workerIds).toEqual(expect.arrayContaining([1, 2, 4]))
    expect(mockShiftWorkerCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { shiftId: 7, workerId: 2 },
        { shiftId: 7, workerId: 4 },
      ]),
    })
    expect(mockShiftWorkerDeleteMany).toHaveBeenCalledWith({
      where: { shiftId: 7, workerId: { in: [3] } },
    })
    expect(mockAssignmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { shiftId: 7, pumpId: 1, workerId: 2 },
      })
    )
    expect(mockShiftUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { shopAccountableWorkerId: 4 },
    })
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "SHIFT_UPDATED",
          shiftId: 7,
        }),
      })
    )
  })

  it("refuses to remove a worker who has cash hand-ins on the shift", async () => {
    mockShiftWorkerFindMany.mockResolvedValue([
      { shiftId: 7, workerId: 1 },
      { shiftId: 7, workerId: 3 },
    ])
    mockWorkerFindMany.mockResolvedValue([{ id: 1, name: "Alice", active: true }])
    mockPumpFindMany.mockResolvedValue([])
    mockHandInCount.mockResolvedValue(1)

    await request(app)
      .put("/api/shifts/7/team")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ workerIds: [1], pumpAssignments: [] })
      .expect(409)

    expect(mockShiftWorkerDeleteMany).not.toHaveBeenCalled()
  })

  it("rejects team changes on a RECONCILED shift", async () => {
    mockShiftFindUnique.mockResolvedValue({ id: 7, status: "RECONCILED" })

    await request(app)
      .put("/api/shifts/7/team")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ workerIds: [1], pumpAssignments: [] })
      .expect(409)
  })

  it("rejects inactive workers", async () => {
    mockShiftWorkerFindMany.mockResolvedValue([])
    mockWorkerFindMany.mockResolvedValue([
      { id: 1, name: "Alice", active: false },
    ])
    mockPumpFindMany.mockResolvedValue([])

    const res = await request(app)
      .put("/api/shifts/7/team")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ workerIds: [1], pumpAssignments: [] })
      .expect(400)

    expect(res.body.error).toMatch(/inactive/i)
  })
})
