import type { Request, Response } from "express"
import { AppError, ErrorCode } from "../types/errors.js"
import {
  getDailyReport,
  getShiftReport,
  getTankVarianceReport,
  type DateRange,
} from "../services/reports.js"

const parseRange = (req: Request): DateRange => {
  const range: DateRange = {}
  const fromParam = req.query.from
  const toParam = req.query.to
  if (typeof fromParam === "string") {
    const from = new Date(fromParam)
    if (Number.isNaN(from.getTime())) {
      throw new AppError("Invalid from date", 400, ErrorCode.VALIDATION_ERROR)
    }
    range.from = from
  }
  if (typeof toParam === "string") {
    const to = new Date(toParam)
    if (Number.isNaN(to.getTime())) {
      throw new AppError("Invalid to date", 400, ErrorCode.VALIDATION_ERROR)
    }
    range.to = to
  }
  return range
}

const wantsCsv = (req: Request): boolean => req.query.format === "csv"

const csvCell = (value: string | number | boolean | null): string => {
  if (value === null) return ""
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const sendCsv = (
  res: Response,
  filename: string,
  header: string[],
  rows: Array<Array<string | number | boolean | null>>
): void => {
  const csv = [
    header.join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n")
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
  res.status(200).send(csv)
}

const shiftsReport = async (req: Request, res: Response): Promise<void> => {
  const rows = await getShiftReport(parseRange(req))

  if (wantsCsv(req)) {
    sendCsv(
      res,
      "shift-report.csv",
      [
        "shiftId",
        "date",
        "status",
        "reconciled",
        "fuelVolume",
        "fuelRevenue",
        "shopRevenue",
        "cashHandedIn",
        "discrepancy",
      ],
      rows.map((r) => [
        r.shiftId,
        r.date.slice(0, 10),
        r.status,
        r.reconciled,
        r.fuelVolume,
        r.fuelRevenue,
        r.shopRevenue,
        r.cashHandedIn,
        r.discrepancy,
      ])
    )
    return
  }

  res.status(200).json(rows)
}

const dailyReport = async (req: Request, res: Response): Promise<void> => {
  const rows = await getDailyReport(parseRange(req))

  if (wantsCsv(req)) {
    sendCsv(
      res,
      "daily-report.csv",
      [
        "date",
        "shiftsTotal",
        "shiftsReconciled",
        "fuelVolume",
        "fuelRevenue",
        "shopRevenue",
        "cashHandedIn",
        "discrepancy",
      ],
      rows.map((r) => [
        r.date,
        r.shiftsTotal,
        r.shiftsReconciled,
        r.fuelVolume,
        r.fuelRevenue,
        r.shopRevenue,
        r.cashHandedIn,
        r.discrepancy,
      ])
    )
    return
  }

  res.status(200).json(rows)
}

const tankVarianceReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  const tankId = Number.parseInt(String(req.query.tankId), 10)
  if (Number.isNaN(tankId)) {
    throw new AppError("tankId is required", 400, ErrorCode.VALIDATION_ERROR)
  }

  const report = await getTankVarianceReport(tankId, parseRange(req))

  if (wantsCsv(req)) {
    sendCsv(
      res,
      `tank-variance-${report.tankName.replace(/[^a-z0-9-]/gi, "_")}.csv`,
      [
        "measuredAt",
        "actualQuantity",
        "theoreticalQuantity",
        "variance",
        "cumulativeVariance",
        "withinTolerance",
      ],
      report.rows.map((r) => [
        r.measuredAt,
        r.actualQuantity,
        r.theoreticalQuantity,
        r.variance,
        r.cumulativeVariance,
        r.withinTolerance,
      ])
    )
    return
  }

  res.status(200).json(report)
}

export { shiftsReport, dailyReport, tankVarianceReport }
