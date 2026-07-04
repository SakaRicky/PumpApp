import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import request from "supertest"
import { app } from "../app.js"

const ADMIN_TOKEN = "admin-token"

const mockExpenseFindMany = vi.fn()
const mockExpenseFindUnique = vi.fn()
const mockExpenseCreate = vi.fn()
const mockExpenseUpdate = vi.fn()
const mockExpenseDelete = vi.fn()
const mockDepositFindMany = vi.fn()
const mockDepositFindUnique = vi.fn()
const mockDepositCreate = vi.fn()
const mockDepositDelete = vi.fn()
const mockEventCreate = vi.fn()

const txClient = {
  expense: {
    create: (...args: unknown[]) => mockExpenseCreate(...args),
    update: (...args: unknown[]) => mockExpenseUpdate(...args),
    delete: (...args: unknown[]) => mockExpenseDelete(...args),
  },
  cashDeposit: {
    create: (...args: unknown[]) => mockDepositCreate(...args),
    delete: (...args: unknown[]) => mockDepositDelete(...args),
  },
  event: {
    create: (...args: unknown[]) => mockEventCreate(...args),
  },
}

vi.mock("../db.js", () => ({
  prisma: {
    expense: {
      findMany: (...args: unknown[]) => mockExpenseFindMany(...args),
      findUnique: (...args: unknown[]) => mockExpenseFindUnique(...args),
    },
    cashDeposit: {
      findMany: (...args: unknown[]) => mockDepositFindMany(...args),
      findUnique: (...args: unknown[]) => mockDepositFindUnique(...args),
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

const expenseRow = {
  id: 1,
  date: new Date("2026-07-03T00:00:00.000Z"),
  category: "Électricité",
  amount: { toNumber: () => 25000 },
  paidBy: "Gérant",
  description: null,
  recordedById: 1,
  createdAt: new Date("2026-07-03T09:00:00.000Z"),
  updatedAt: new Date("2026-07-03T09:00:00.000Z"),
}

const depositRow = {
  id: 2,
  date: new Date("2026-07-03T00:00:00.000Z"),
  amount: { toNumber: () => 500000 },
  destination: "Afriland",
  reference: "DEP-42",
  notes: null,
  recordedById: 1,
  createdAt: new Date("2026-07-03T10:00:00.000Z"),
  updatedAt: new Date("2026-07-03T10:00:00.000Z"),
}

describe("Expenses & cash deposits API (integration)", () => {
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

  it("GET /api/expenses requires admin", async () => {
    await request(app)
      .get("/api/expenses")
      .set("Authorization", "Bearer not-admin")
      .expect(403)
    expect(mockExpenseFindMany).not.toHaveBeenCalled()
  })

  it("POST /api/expenses creates the expense and journals an event", async () => {
    mockExpenseCreate.mockResolvedValue(expenseRow)

    const res = await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ date: "2026-07-03", category: "Électricité", amount: 25000 })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 1,
      category: "Électricité",
      amount: 25000,
      recordedById: 1,
    })
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "EXPENSE_RECORDED",
          actorUserId: 1,
          entity: "expense",
          entityId: 1,
        }),
      })
    )
  })

  it("POST /api/expenses rejects a non-positive amount", async () => {
    await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ date: "2026-07-03", category: "Divers", amount: 0 })
      .expect(400)
    expect(mockExpenseCreate).not.toHaveBeenCalled()
  })

  it("DELETE /api/expenses/:id deletes and journals", async () => {
    mockExpenseFindUnique.mockResolvedValue(expenseRow)
    mockExpenseDelete.mockResolvedValue(expenseRow)

    await request(app)
      .delete("/api/expenses/1")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(204)

    expect(mockExpenseDelete).toHaveBeenCalledWith({ where: { id: 1 } })
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "EXPENSE_DELETED" }),
      })
    )
  })

  it("POST /api/cash-deposits creates the deposit and journals an event", async () => {
    mockDepositCreate.mockResolvedValue(depositRow)

    const res = await request(app)
      .post("/api/cash-deposits")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({
        date: "2026-07-03",
        amount: 500000,
        destination: "Afriland",
        reference: "DEP-42",
      })
      .expect(201)

    expect(res.body).toMatchObject({
      id: 2,
      amount: 500000,
      destination: "Afriland",
      reference: "DEP-42",
    })
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "CASH_DEPOSIT_RECORDED",
          entity: "cashDeposit",
          entityId: 2,
        }),
      })
    )
  })

  it("GET /api/cash-deposits returns rows for admin", async () => {
    mockDepositFindMany.mockResolvedValue([depositRow])

    const res = await request(app)
      .get("/api/cash-deposits")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .expect(200)

    expect(res.body[0]).toMatchObject({
      id: 2,
      destination: "Afriland",
      amount: 500000,
    })
  })
})
