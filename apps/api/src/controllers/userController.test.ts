import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Request, Response } from "express"
import { list, create, update } from "./userController.js"
import { AppError } from "../types/errors.js"

const mockFindMany = vi.fn()
const mockUserFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockWorkerFindUnique = vi.fn()

vi.mock("../db.js", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    worker: {
      findUnique: (...args: unknown[]) => mockWorkerFindUnique(...args),
    },
  },
}))

const mockHash = vi.fn()
vi.mock("bcrypt", () => ({
  default: {
    hash: (...args: unknown[]) => mockHash(...args),
  },
}))

const createMockRes = (): Response =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }) as unknown as Response

const makeUserWithWorker = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  workerId: 10,
  name: "Test User",
  email: "u@test.com",
  passwordHash: "hashed",
  role: "ADMIN",
  userType: "SYSTEM_USER",
  active: true,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-02T00:00:00.000Z"),
  worker: {
    id: 10,
    name: "Worker One",
    designation: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  ...overrides,
})

describe("userController.list", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 200 with array of UserResponse including workerId and worker", async () => {
    const user = makeUserWithWorker()
    mockFindMany.mockResolvedValue([user])

    const res = createMockRes()
    await list({} as Request, res)

    expect(mockFindMany).toHaveBeenCalledWith({ include: { worker: true } })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith([
      {
        id: 1,
        workerId: 10,
        name: "Test User",
        email: "u@test.com",
        role: "ADMIN",
        active: true,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
        worker: { id: 10, name: "Worker One" },
      },
    ])
    expect(
      (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0][0]
    ).not.toHaveProperty("passwordHash")
  })
})

describe("userController.create", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 201 and UserResponse when body is valid and worker has no user", async () => {
    const worker = {
      id: 10,
      name: "W",
      designation: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: null,
    }
    mockWorkerFindUnique.mockResolvedValue(worker)
    mockHash.mockResolvedValue("hashed")
    const created = makeUserWithWorker({ workerId: 10 })
    mockCreate.mockResolvedValue(created)

    const req = {
      body: {
        workerId: 10,
        name: "Test User",
        email: "u@test.com",
        password: "secret",
        role: "ADMIN",
      },
    } as Request
    const res = createMockRes()

    await create(req, res)

    expect(mockWorkerFindUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      include: { user: true },
    })
    expect(mockHash).toHaveBeenCalledWith("secret", 10)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        workerId: 10,
        name: "Test User",
        email: "u@test.com",
        passwordHash: "hashed",
        role: "ADMIN",
      },
      include: { worker: true },
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        workerId: 10,
        name: "Test User",
        email: "u@test.com",
        role: "ADMIN",
        active: true,
      })
    )
    expect(
      (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0]
    ).not.toHaveProperty("passwordHash")
  })

  it("throws 400 when worker not found", async () => {
    mockWorkerFindUnique.mockResolvedValue(null)

    const req = {
      body: {
        workerId: 999,
        name: "U",
        email: "u@t.com",
        password: "p",
        role: "USER",
      },
    } as Request
    const res = createMockRes()

    await expect(create(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Worker not found",
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("throws 400 when worker already has a user", async () => {
    mockWorkerFindUnique.mockResolvedValue({
      id: 10,
      name: "W",
      user: { id: 1 },
    })

    const req = {
      body: {
        workerId: 10,
        name: "U",
        email: "u@t.com",
        password: "p",
        role: "USER",
      },
    } as Request
    const res = createMockRes()

    await expect(create(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Worker already has a user account",
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("throws 400 with validation details when body is invalid", async () => {
    const req = {
      body: { name: "U", email: "invalid", password: "p", role: "USER" },
    } as Request
    const res = createMockRes()

    await expect(create(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Validation failed",
    })
    expect(mockWorkerFindUnique).not.toHaveBeenCalled()
  })

  it("throws AppError with VALIDATION_ERROR when workerId is missing", async () => {
    const req = {
      body: { name: "U", email: "u@t.com", password: "p", role: "USER" },
    } as Request
    const res = createMockRes()

    const err = await create(req, res).catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect((err as AppError).code).toBe("VALIDATION_ERROR")
  })
})

describe("userController.update", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 200 and UserResponse when id and body are valid", async () => {
    const existing = makeUserWithWorker()
    mockUserFindUnique.mockResolvedValue(existing)
    const updated = makeUserWithWorker({ name: "Updated Name" })
    mockUpdate.mockResolvedValue(updated)

    const req = {
      params: { id: "1" },
      body: { name: "Updated Name" },
    } as unknown as Request
    const res = createMockRes()

    await update(req, res)

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { worker: true },
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Updated Name" },
      include: { worker: true },
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
      message: "Invalid user id",
    })
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it("throws 404 when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null)

    const req = {
      params: { id: "999" },
      body: { name: "U" },
    } as unknown as Request
    const res = createMockRes()

    await expect(update(req, res)).rejects.toMatchObject({
      statusCode: 404,
      message: "User not found",
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("throws 400 when body is invalid", async () => {
    mockUserFindUnique.mockResolvedValue(makeUserWithWorker())

    const req = {
      params: { id: "1" },
      body: { email: "not-an-email" },
    } as unknown as Request
    const res = createMockRes()

    await expect(update(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Validation failed",
    })
  })
})
