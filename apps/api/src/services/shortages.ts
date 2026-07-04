import type {
  ShortageLedgerEntry,
  WorkerShortageBalance,
  WorkerShortageLedgerResponse,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"

const round2 = (n: number): number => Math.round(n * 100) / 100

/**
 * Charges are the authoritative weekly-close enforced shortfalls
 * (see docs/OPERATIONS.md); settlements are payroll deductions or repayments.
 * Balance = Σ charges − Σ settlements (positive = owed by the worker).
 */
export const getWorkerShortageBalances = async (): Promise<
  WorkerShortageBalance[]
> => {
  const [workers, chargeSums, settlementSums] = await Promise.all([
    prisma.worker.findMany({ orderBy: { name: "asc" } }),
    prisma.weeklyInventoryClose.groupBy({
      by: ["workerId"],
      _sum: { enforcedShortfall: true },
    }),
    prisma.shortageSettlement.groupBy({
      by: ["workerId"],
      _sum: { amount: true },
    }),
  ])

  const chargesByWorker = new Map<number, number>(
    chargeSums.map((row) => [
      row.workerId,
      Number(row._sum.enforcedShortfall ?? 0),
    ])
  )
  const settlementsByWorker = new Map<number, number>(
    settlementSums.map((row) => [row.workerId, Number(row._sum.amount ?? 0)])
  )

  return workers
    .map((worker) => {
      const chargesTotal = round2(chargesByWorker.get(worker.id) ?? 0)
      const settlementsTotal = round2(settlementsByWorker.get(worker.id) ?? 0)
      return {
        workerId: worker.id,
        workerName: worker.name,
        chargesTotal,
        settlementsTotal,
        balance: round2(chargesTotal - settlementsTotal),
      }
    })
    .filter(
      (row) =>
        row.chargesTotal !== 0 || row.settlementsTotal !== 0 || row.balance !== 0
    )
}

export const getWorkerShortageLedger = async (
  workerId: number
): Promise<WorkerShortageLedgerResponse> => {
  const worker = await prisma.worker.findUnique({ where: { id: workerId } })
  if (!worker) {
    throw new AppError("Worker not found", 404, ErrorCode.NOT_FOUND)
  }

  const [charges, settlements] = await Promise.all([
    prisma.weeklyInventoryClose.findMany({
      where: { workerId },
      orderBy: { weekStart: "asc" },
    }),
    prisma.shortageSettlement.findMany({
      where: { workerId },
      orderBy: { date: "asc" },
    }),
  ])

  type RawEntry = Omit<ShortageLedgerEntry, "balanceAfter">
  const raw: RawEntry[] = [
    ...charges.map((c) => ({
      kind: "charge" as const,
      id: c.id,
      date: c.weekEnd.toISOString(),
      amount: c.enforcedShortfall.toNumber(),
      notes: c.notes,
    })),
    ...settlements.map((s) => ({
      kind: "settlement" as const,
      id: s.id,
      date: s.date.toISOString(),
      amount: s.amount.toNumber(),
      notes: s.notes,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  let balance = 0
  let chargesTotal = 0
  let settlementsTotal = 0
  const entries: ShortageLedgerEntry[] = raw.map((entry) => {
    if (entry.kind === "charge") {
      balance = round2(balance + entry.amount)
      chargesTotal = round2(chargesTotal + entry.amount)
    } else {
      balance = round2(balance - entry.amount)
      settlementsTotal = round2(settlementsTotal + entry.amount)
    }
    return { ...entry, balanceAfter: balance }
  })

  return {
    workerId: worker.id,
    workerName: worker.name,
    chargesTotal,
    settlementsTotal,
    balance,
    entries,
  }
}
