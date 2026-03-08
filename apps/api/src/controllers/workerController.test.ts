import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Request, Response } from "express"
import { list, create, update } from "./workerController.js"
import { AppError } from "../types/errors.js"

const mockFindMany = vi.fn()
const mockFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    worker: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

const createMockRes = (): Response =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }) as unknown as Response

const makeWorker = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: "Worker One",
  designation: "Pumpist",
  active: true,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-02T00:00:00.000Z"),
  ...overrides,
})

describe("workerController.list", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 200 with array of WorkerResponse", async () => {
    const worker = makeWorker()
    mockFindMany.mockResolvedValue([worker])

    const res = createMockRes()
    await list({} as Request, res)

    expect(mockFindMany).toHaveBeenCalledWith()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 1,
        name: "Worker One",
        designation: "Pumpist",
        active: true,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
    ])
  })
})

describe("workerController.create", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 201 and WorkerResponse when body is valid", async () => {
    const created = makeWorker()
    mockCreate.mockResolvedValue(created)

    const req = {
      body: { name: "Worker One", designation: "Pumpist" },
    } as Request
    const res = createMockRes()

    await create(req, res)

    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: "Worker One", designation: "Pumpist" },
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      name: "Worker One",
      designation: "Pumpist",
      active: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    })
  })

  it("throws 400 with validation details when body is invalid", async () => {
    const req = { body: { name: "" } } as Request
    const res = createMockRes()

    await expect(create(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Validation failed",
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("throws AppError with VALIDATION_ERROR on validation failure", async () => {
    const req = { body: {} } as Request
    const res = createMockRes()

    const err = await create(req, res).catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect((err as AppError).code).toBe("VALIDATION_ERROR")
  })
})

describe("workerController.update", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 200 and WorkerResponse when id and body are valid", async () => {
    const existing = makeWorker()
    mockFindUnique.mockResolvedValue(existing)
    const updated = makeWorker({ name: "Updated Name" })
    mockUpdate.mockResolvedValue(updated)

    const req = {
      params: { id: "1" },
      body: { name: "Updated Name" },
    } as unknown as Request
    const res = createMockRes()

    await update(req, res)

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 1 } })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Updated Name" },
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        name: "Updated Name",
      })
    )
  })

  it("throws 400 when id is not a valid integer", async () => {
    const req = {
      params: { id: "x" },
      body: { name: "U" },
    } as unknown as Request
    const res = createMockRes()

    await expect(update(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid worker id",
    })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it("throws 404 when worker not found", async () => {
    mockFindUnique.mockResolvedValue(null)

    const req = {
      params: { id: "999" },
      body: { name: "U" },
    } as unknown as Request
    const res = createMockRes()

    await expect(update(req, res)).rejects.toMatchObject({
      statusCode: 404,
      message: "Worker not found",
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("throws 400 when body is invalid", async () => {
    mockFindUnique.mockResolvedValue(makeWorker())

    const req = {
      params: { id: "1" },
      body: { name: "" },
    } as unknown as Request
    const res = createMockRes()

    await expect(update(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Validation failed",
    })
  })
})
