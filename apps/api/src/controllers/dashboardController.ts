import type { Request, Response } from "express"
import type {
  DashboardPendingShift,
  DashboardRecentDiscrepancy,
  DashboardResponse,
  DashboardTank,
  DashboardToday,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { getVolumeAndRevenueForShift } from "../services/fuelRevenue.js"
import { getShopSalesTotalFromShiftStock } from "../services/shopShiftRevenue.js"
import { getSafeBalance } from "../services/safeBalance.js"
import { varianceWithinTolerance } from "../services/tankTolerance.js"
import {
  DAY_MS,
  getTodayActiveShift,
  startOfLocalDay,
} from "../services/todayShift.js"

const buildPendingQueue = async (
  now: Date
): Promise<DashboardPendingShift[]> => {
  const closed = await prisma.shift.findMany({
    where: { status: "CLOSED" },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })

  const today = startOfLocalDay(now).getTime()
  return closed.map((shift) => ({
    shiftId: shift.id,
    date: shift.date.toISOString(),
    startTime: shift.startTime.toISOString(),
    endTime: shift.endTime.toISOString(),
    status: shift.status,
    ageDays: Math.max(
      0,
      Math.floor((today - startOfLocalDay(shift.date).getTime()) / DAY_MS)
    ),
  }))
}

const buildStaleOpenShifts = async (
  now: Date
): Promise<DashboardPendingShift[]> => {
  const dayStart = startOfLocalDay(now)
  const shifts = await prisma.shift.findMany({
    where: {
      status: { in: ["PLANNED", "OPEN"] },
      date: { lt: dayStart },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })

  const today = dayStart.getTime()
  return shifts.map((shift) => ({
    shiftId: shift.id,
    date: shift.date.toISOString(),
    startTime: shift.startTime.toISOString(),
    endTime: shift.endTime.toISOString(),
    status: shift.status,
    ageDays: Math.max(
      0,
      Math.floor((today - startOfLocalDay(shift.date).getTime()) / DAY_MS)
    ),
  }))
}

const buildToday = async (now: Date): Promise<DashboardToday> => {
  const dayStart = startOfLocalDay(now)
  const dayEnd = new Date(dayStart.getTime() + DAY_MS)

  const [shifts, currentShift] = await Promise.all([
    prisma.shift.findMany({
      where: { date: { gte: dayStart, lt: dayEnd } },
      include: { reconciliation: true },
    }),
    getTodayActiveShift(now),
  ])
  const shiftIds = shifts.map((s) => s.id)

  let fuelVolume = 0
  let fuelRevenue: number | null = 0
  let shopRevenue = 0

  for (const shift of shifts) {
    try {
      const fr = await getVolumeAndRevenueForShift(shift.id)
      fuelVolume += fr.totalVolume
      if (fuelRevenue !== null) fuelRevenue += fr.totalRevenue
    } catch {
      // Price or tank link missing: still count raw volume, flag revenue unknown.
      const readings = await prisma.pumpReading.findMany({
        where: { shiftId: shift.id },
      })
      for (const r of readings) {
        fuelVolume += Number(r.closingReading) - Number(r.openingReading)
      }
      fuelRevenue = null
    }

    if (shift.reconciliation) {
      shopRevenue += shift.reconciliation.effectiveShopSalesTotal.toNumber()
    } else {
      shopRevenue += await getShopSalesTotalFromShiftStock(shift.id)
    }
  }

  const cashAgg = shiftIds.length
    ? await prisma.cashHandIn.aggregate({
        where: { shiftId: { in: shiftIds } },
        _sum: { amount: true },
      })
    : null

  const expenseAgg = await prisma.expense.aggregate({
    where: { date: { gte: dayStart, lt: dayEnd } },
    _sum: { amount: true },
  })

  const round2 = (n: number): number => Math.round(n * 100) / 100

  return {
    date: dayStart.toISOString(),
    shiftsTotal: shifts.length,
    shiftsReconciled: shifts.filter((s) => s.status === "RECONCILED").length,
    currentShiftId: currentShift?.id ?? null,
    currentShiftStatus: currentShift?.status ?? null,
    fuelVolume: round2(fuelVolume),
    fuelRevenue: fuelRevenue !== null ? round2(fuelRevenue) : null,
    shopRevenue: round2(shopRevenue),
    cashHandedIn: round2(Number(cashAgg?._sum.amount ?? 0)),
    expenses: round2(Number(expenseAgg._sum.amount ?? 0)),
  }
}

const buildTanks = async (): Promise<DashboardTank[]> => {
  const tanks = await prisma.tank.findMany({
    where: { active: true },
    include: { fuelType: true },
    orderBy: { id: "asc" },
  })

  return tanks.map((tank) => {
    const theoretical =
      tank.theoreticalQuantity !== null
        ? Number(tank.theoreticalQuantity)
        : null
    const actual =
      tank.actualQuantity !== null ? Number(tank.actualQuantity) : null
    const capacity = tank.capacity !== null ? Number(tank.capacity) : null
    const variance =
      theoretical !== null && actual !== null
        ? Math.round((actual - theoretical) * 1000) / 1000
        : null
    return {
      id: tank.id,
      name: tank.name,
      fuelTypeName: tank.fuelType.name,
      capacity,
      theoreticalQuantity: theoretical,
      actualQuantity: actual,
      actualQuantityRecordedAt:
        tank.actualQuantityRecordedAt?.toISOString() ?? null,
      varianceQuantity: variance,
      withinTolerance:
        variance !== null
          ? varianceWithinTolerance(variance, {
              capacity,
              dipToleranceLiters:
                tank.dipToleranceLiters !== null
                  ? Number(tank.dipToleranceLiters)
                  : null,
              dipTolerancePct:
                tank.dipTolerancePct !== null
                  ? Number(tank.dipTolerancePct)
                  : null,
            })
          : null,
    }
  })
}

const buildRecentDiscrepancies = async (): Promise<
  DashboardRecentDiscrepancy[]
> => {
  const rows = await prisma.shiftReconciliationSummary.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { shift: true },
  })

  return rows.map((row) => ({
    shiftId: row.shiftId,
    date: row.shift.date.toISOString(),
    discrepancyAmount: row.discrepancyAmount.toNumber(),
  }))
}

const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  const now = new Date()

  const [
    pendingReconciliations,
    staleOpenShifts,
    today,
    tanks,
    recentDiscrepancies,
    safeBalance,
  ] = await Promise.all([
    buildPendingQueue(now),
    buildStaleOpenShifts(now),
    buildToday(now),
    buildTanks(),
    buildRecentDiscrepancies(),
    getSafeBalance(),
  ])

  const response: DashboardResponse = {
    pendingReconciliations,
    staleOpenShifts,
    today,
    tanks,
    recentDiscrepancies,
    safeBalance,
  }
  res.status(200).json(response)
}

export { getDashboard }
