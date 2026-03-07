import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Request, Response } from "express"
import { login } from "./authController.js"
import { AppError } from "../types/errors.js"

const mockFindUnique = vi.fn()
vi.mock("../db.js", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

const mockCompare = vi.fn()
vi.mock("bcrypt", () => ({
  default: {
    compare: (...args: unknown[]) => mockCompare(...args),
  },
}))

const mockSign = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (...args: unknown[]) => mockSign(...args),
  },
}))

const createMockRes = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
  return res
}

describe("authController.login", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
    mockSign.mockReturnValue("fake-jwt-token")
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns 200 with token and user when credentials are valid", async () => {
    const user = {
      id: 1,
      name: "Test User",
      email: "user@test.com",
      passwordHash: "hashed",
      role: "ADMIN" as const,
      userType: "SYSTEM_USER" as const,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockFindUnique.mockResolvedValue(user)
    mockCompare.mockResolvedValue(true)

    const req = {
      body: { username: "user@test.com", password: "secret" },
    } as Request
    const res = createMockRes()

    await login(req, res)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "user@test.com" },
    })
    expect(mockCompare).toHaveBeenCalledWith("secret", "hashed")
    expect(mockSign).toHaveBeenCalledWith(
      { id: 1, role: "ADMIN" },
      "test-secret",
      { expiresIn: "7d" }
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      token: "fake-jwt-token",
      user: { id: 1, name: "Test User", role: "ADMIN" },
    })
  })

  it("throws 401 when user is not found", async () => {
    mockFindUnique.mockResolvedValue(null)

    const req = {
      body: { username: "nobody@test.com", password: "secret" },
    } as Request
    const res = createMockRes()

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid credentials",
    })
    expect(mockCompare).not.toHaveBeenCalled()
    expect(mockSign).not.toHaveBeenCalled()
  })

  it("throws 401 when user is inactive", async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      name: "Test",
      email: "u@t.com",
      passwordHash: "hash",
      role: "ADMIN",
      userType: "SYSTEM_USER",
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const req = { body: { username: "u@t.com", password: "secret" } } as Request
    const res = createMockRes()

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid credentials",
    })
    expect(mockCompare).not.toHaveBeenCalled()
  })

  it("throws 401 when userType is not SYSTEM_USER", async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      name: "Test",
      email: "u@t.com",
      passwordHash: "hash",
      role: "ADMIN",
      userType: "OTHER",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const req = { body: { username: "u@t.com", password: "secret" } } as Request
    const res = createMockRes()

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid credentials",
    })
    expect(mockCompare).not.toHaveBeenCalled()
  })

  it("throws 401 when password is wrong", async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      name: "Test",
      email: "u@t.com",
      passwordHash: "hash",
      role: "ADMIN",
      userType: "SYSTEM_USER",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockCompare.mockResolvedValue(false)

    const req = { body: { username: "u@t.com", password: "wrong" } } as Request
    const res = createMockRes()

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 401,
      message: "Invalid credentials",
    })
    expect(mockSign).not.toHaveBeenCalled()
  })

  it("throws 400 with validation details when username is missing", async () => {
    const req = { body: { password: "secret" } } as Request
    const res = createMockRes()

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Validation failed",
    })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it("throws 400 when password is missing", async () => {
    const req = { body: { username: "u@t.com" } } as Request
    const res = createMockRes()

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Validation failed",
    })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it("throws 400 when body is empty", async () => {
    const req = { body: {} } as Request
    const res = createMockRes()

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 400,
      message: "Validation failed",
    })
  })

  it("throws 500 when JWT_SECRET is not set", async () => {
    delete process.env.JWT_SECRET
    mockFindUnique.mockResolvedValue({
      id: 1,
      name: "Test",
      email: "u@t.com",
      passwordHash: "hash",
      role: "ADMIN",
      userType: "SYSTEM_USER",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    mockCompare.mockResolvedValue(true)

    const req = { body: { username: "u@t.com", password: "secret" } } as Request
    const res = createMockRes()

    await expect(login(req, res)).rejects.toMatchObject({
      statusCode: 500,
      message: "Server misconfiguration",
    })
  })

  it("throws AppError with VALIDATION_ERROR code on validation failure", async () => {
    const req = { body: { username: "" } } as Request
    const res = createMockRes()

    const err = await login(req, res).catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect((err as AppError).code).toBe("VALIDATION_ERROR")
  })
})
