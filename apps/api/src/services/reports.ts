import type {
  DailyReportRow,
  ShiftReportRow,
  TankVarianceReportResponse,
  TankVarianceRow,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"
import { getVolumeAndRevenueForShift } from "./fuelRevenue.js"
import { getShopSalesTotalFromShiftStock } from "./shopShiftRevenue.js"
import { varianceWithinTolerance } from "./tankTolerance.js"

const round2 = (n: number): number => Math.round(n * 100) / 100
const round3 = (n: number): number => Math.round(n * 1000) / 1000

export type DateRange = { from?: Date; to?: Date }

const dateWhere = (range: DateRange) =>
  range.from || range.to
    ? {
        date: {
          ...(range.from && { gte: range.from }),
          ...(range.to && { lte: range.to }),
        },
      }
    : {}

export const getShiftReport = async (
  range: DateRange
): Promise<ShiftReportRow[]> => {
  const shifts = await prisma.shift.findMany({
    where: dateWhere(range),
    include: { reconciliation: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })
  if (shifts.length === 0) return []

  const shiftIds = shifts.map((s) => s.id)

  const [readings, cashSums, stockCounts] = await Promise.all([
    prisma.pumpReading.findMany({ where: { shiftId: { in: shiftIds } } }),
    prisma.cashHandIn.groupBy({
      by: ["shiftId"],
      where: { shiftId: { in: shiftIds } },
      _sum: { amount: true },
    }),
    prisma.shiftProductStock.groupBy({
      by: ["shiftId"],
      where: { shiftId: { in: shiftIds } },
      _count: { productId: true },
    }),
  ])

  const volumeByShift = new Map<number, number>()
  for (const r of readings) {
    const volume = Number(r.closingReading) - Number(r.openingReading)
    volumeByShift.set(r.shiftId, (volumeByShift.get(r.shiftId) ?? 0) + volume)
  }
  const cashByShift = new Map<number, number>(
    cashSums.map((row) => [row.shiftId, Number(row._sum.amount ?? 0)])
  )
  const stockCountByShift = new Map<number, number>(
    stockCounts.map((row) => [row.shiftId, row._count.productId])
  )

  const rows: ShiftReportRow[] = []
  for (const shift of shifts) {
    const summary = shift.reconciliation
    let fuelRevenue: number | null
    let shopRevenue: number | null

    if (summary) {
      fuelRevenue = summary.fuelSalesTotal.toNumber()
      shopRevenue = summary.effectiveShopSalesTotal.toNumber()
    } else {
      try {
        const fr = await getVolumeAndRevenueForShift(shift.id)
        fuelRevenue = round2(fr.totalRevenue)
      } catch {
        fuelRevenue = null
      }
      shopRevenue = (stockCountByShift.get(shift.id) ?? 0) > 0
        ? await getShopSalesTotalFromShiftStock(shift.id)
        : null
    }

    rows.push({
      shiftId: shift.id,
      date: shift.date.toISOString(),
      startTime: shift.startTime.toISOString(),
      endTime: shift.endTime.toISOString(),
      status: shift.status,
      reconciled: shift.status === "RECONCILED",
      fuelVolume: round2(volumeByShift.get(shift.id) ?? 0),
      fuelRevenue,
      shopRevenue,
      cashHandedIn: round2(cashByShift.get(shift.id) ?? 0),
      discrepancy: summary ? summary.discrepancyAmount.toNumber() : null,
    })
  }
  return rows
}

export const getDailyReport = async (
  range: DateRange
): Promise<DailyReportRow[]> => {
  const shiftRows = await getShiftReport(range)

  const byDate = new Map<string, ShiftReportRow[]>()
  for (const row of shiftRows) {
    const day = row.date.slice(0, 10)
    const bucket = byDate.get(day)
    if (bucket) bucket.push(row)
    else byDate.set(day, [row])
  }

  const sumOrNull = (values: Array<number | null>): number | null =>
    values.some((v) => v === null)
      ? null
      : round2(values.reduce<number>((acc, v) => acc + (v as number), 0))

  return Array.from(byDate.entries()).map(([date, rows]) => ({
    date,
    shiftsTotal: rows.length,
    shiftsReconciled: rows.filter((r) => r.reconciled).length,
    fuelVolume: round2(rows.reduce((acc, r) => acc + r.fuelVolume, 0)),
    fuelRevenue: sumOrNull(rows.map((r) => r.fuelRevenue)),
    shopRevenue: sumOrNull(rows.map((r) => r.shopRevenue)),
    cashHandedIn: round2(rows.reduce((acc, r) => acc + r.cashHandedIn, 0)),
    discrepancy: sumOrNull(rows.map((r) => r.discrepancy)),
  }))
}

export const getTankVarianceReport = async (
  tankId: number,
  range: { from?: Date; to?: Date }
): Promise<TankVarianceReportResponse> => {
  const tank = await prisma.tank.findUnique({
    where: { id: tankId },
    include: { fuelType: true },
  })
  if (!tank) {
    throw new AppError("Tank not found", 404, ErrorCode.NOT_FOUND)
  }

  const readings = await prisma.tankLevelReading.findMany({
    where: {
      tankId,
      ...((range.from || range.to) && {
        measuredAt: {
          ...(range.from && { gte: range.from }),
          ...(range.to && { lte: range.to }),
        },
      }),
    },
    orderBy: { measuredAt: "asc" },
  })

  const tolerance = {
    capacity: tank.capacity !== null ? Number(tank.capacity) : null,
    dipToleranceLiters:
      tank.dipToleranceLiters !== null ? Number(tank.dipToleranceLiters) : null,
    dipTolerancePct:
      tank.dipTolerancePct !== null ? Number(tank.dipTolerancePct) : null,
  }

  let cumulative = 0
  let hasCumulative = false
  const rows: TankVarianceRow[] = readings.map((reading) => {
    const actual = Number(reading.quantity)
    const theoretical =
      reading.theoreticalQuantityAtTime !== null
        ? Number(reading.theoreticalQuantityAtTime)
        : null
    const variance = theoretical !== null ? round3(actual - theoretical) : null
    if (variance !== null) {
      cumulative = round3(cumulative + variance)
      hasCumulative = true
    }
    return {
      readingId: reading.id,
      measuredAt: reading.measuredAt.toISOString(),
      actualQuantity: actual,
      theoreticalQuantity: theoretical,
      variance,
      cumulativeVariance: hasCumulative ? cumulative : null,
      withinTolerance:
        variance !== null ? varianceWithinTolerance(variance, tolerance) : null,
    }
  })

  return {
    tankId: tank.id,
    tankName: tank.name,
    fuelTypeName: tank.fuelType.name,
    capacity: tolerance.capacity,
    dipToleranceLiters: tolerance.dipToleranceLiters,
    dipTolerancePct: tolerance.dipTolerancePct,
    rows,
  }
}
