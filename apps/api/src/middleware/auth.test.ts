import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Request, Response, NextFunction } from "express"
import { requireAuth, requireAdmin } from "./auth.js"
import { AppError } from "../types/errors.js"
import { Role } from "@pumpapp/shared"

const mockVerify = vi.fn()
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: (...args: unknown[]) => mockVerify(...args),
  },
}))

const createMockReq = (overrides: Partial<Request> = {}): Request =>
  ({ headers: {}, ...overrides }) as Request

const createMockRes = (): Response =>
  ({ status: vi.fn(), json: vi.fn() }) as unknown as Response

const createNext = (): NextFunction => vi.fn()

describe("requireAuth", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, JWT_SECRET: "test-secret" }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("calls next() with 401 when Authorization header is missing", () => {
    const req = createMockReq()
    const res = createMockRes()
    const next = createNext()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(401)
    expect(err.message).toMatch(/authorization/i)
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it("calls next() with 401 when Authorization does not start with Bearer", () => {
    const req = createMockReq({
      headers: { authorization: "Basic xyz" },
    })
    const res = createMockRes()
    const next = createNext()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(401)
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it("calls next() with 401 when Bearer token is empty", () => {
    const req = createMockReq({
      headers: { authorization: "Bearer " },
    })
    const res = createMockRes()
    const next = createNext()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(401)
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it("calls next() with 401 when token is invalid or expired", () => {
    mockVerify.mockImplementation(() => {
      throw new Error("invalid")
    })
    const req = createMockReq({
      headers: { authorization: "Bearer bad-token" },
    })
    const res = createMockRes()
    const next = createNext()

    requireAuth(req, res, next)

    expect(mockVerify).toHaveBeenCalledWith("bad-token", "test-secret")
    expect(next).toHaveBeenCalledTimes(1)
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(401)
    expect(err.message).toMatch(/invalid|expired/i)
  })

  it("sets req.user and calls next() when token is valid", () => {
    mockVerify.mockReturnValue({ id: 42, role: Role.ADMIN })
    const req = createMockReq({
      headers: { authorization: "Bearer valid-token" },
    }) as Request & { user?: { id: number; role: Role } }
    const res = createMockRes()
    const next = createNext()

    requireAuth(req, res, next)

    expect(mockVerify).toHaveBeenCalledWith("valid-token", "test-secret")
    expect(req.user).toEqual({ id: 42, role: Role.ADMIN })
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  it("calls next() with 500 when JWT_SECRET is not set", () => {
    delete process.env.JWT_SECRET
    const req = createMockReq({
      headers: { authorization: "Bearer some-token" },
    })
    const res = createMockRes()
    const next = createNext()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(500)
    expect(err.message).toMatch(/misconfiguration/i)
  })
})

describe("requireAdmin", () => {
  it("calls next() with 401 when req.user is missing", () => {
    const req = createMockReq() as Request & {
      user?: { id: number; role: Role }
    }
    const res = createMockRes()
    const next = createNext()

    requireAdmin(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(401)
  })

  it("calls next() with 403 when req.user.role is not ADMIN", () => {
    const req = createMockReq() as Request & {
      user?: { id: number; role: Role }
    }
    req.user = { id: 1, role: Role.USER }
    const res = createMockRes()
    const next = createNext()

    requireAdmin(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(403)
    expect(err.message).toBe("Forbidden")
  })

  it("calls next() with 403 for role SALE", () => {
    const req = createMockReq() as Request & {
      user?: { id: number; role: Role }
    }
    req.user = { id: 1, role: Role.SALE }
    const res = createMockRes()
    const next = createNext()

    requireAdmin(req, res, next)

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(err.statusCode).toBe(403)
  })

  it("calls next() with no error when req.user.role is ADMIN", () => {
    const req = createMockReq() as Request & {
      user?: { id: number; role: Role }
    }
    req.user = { id: 1, role: Role.ADMIN }
    const res = createMockRes()
    const next = createNext()

    requireAdmin(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })
})
