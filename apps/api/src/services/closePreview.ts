import type {
  ShiftClosePreviewResponse,
  ShiftClosePreviewShopLine,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { getPriceForShift } from "../controllers/fuelPriceHistoryController.js"
import { varianceWithinTolerance } from "./tankTolerance.js"
import { DAY_MS, startOfLocalDay } from "./todayShift.js"

const round2 = (n: number): number => Math.round(n * 100) / 100
const round3 = (n: number): number => Math.round(n * 1000) / 1000

export const buildClosePreview = async (
  shiftId: number
): Promise<ShiftClosePreviewResponse | null> => {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) return null

  const [pumps, readings, stockRows, tanks] = await Promise.all([
    prisma.pump.findMany({
      where: { active: true },
      include: { tank: true },
      orderBy: { id: "asc" },
    }),
    prisma.pumpReading.findMany({ where: { shiftId } }),
    prisma.shiftProductStock.findMany({
      where: { shiftId },
      include: { product: true },
      orderBy: { product: { name: "asc" } },
    }),
    prisma.tank.findMany({ where: { active: true } }),
  ])

  const readingByPump = new Map(readings.map((reading) => [reading.pumpId, reading]))
  const blockers: string[] = []
  const warnings: string[] = []
  let fuelVolume = 0
  let fuelRevenue: number | null = 0
  let fuelError: string | null = null

  const previewPumps = await Promise.all(
    pumps.map(async (pump) => {
      const reading = readingByPump.get(pump.id)
      if (!reading) {
        blockers.push(`Missing pump reading for ${pump.name}`)
        return {
          pumpId: pump.id,
          name: pump.name,
          opening: null,
          closing: null,
          volume: null,
          price: null,
          revenue: null,
          error: "Missing pump reading",
        }
      }

      const opening = Number(reading.openingReading)
      const closing = Number(reading.closingReading)
      const volume = round3(closing - opening)
      fuelVolume += volume

      if (!pump.tank?.fuelTypeId) {
        const error = "Pump is not linked to a fuel tank"
        fuelError = fuelError ?? error
        fuelRevenue = null
        return {
          pumpId: pump.id,
          name: pump.name,
          opening,
          closing,
          volume,
          price: null,
          revenue: null,
          error,
        }
      }

      try {
        const price = await getPriceForShift(pump.tank.fuelTypeId, shift.date)
        const revenue = round2(volume * price.pricePerUnit)
        if (fuelRevenue !== null) fuelRevenue += revenue
        return {
          pumpId: pump.id,
          name: pump.name,
          opening,
          closing,
          volume,
          price: price.pricePerUnit,
          revenue,
          error: null,
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : "Fuel price unavailable"
        fuelError = fuelError ?? error
        fuelRevenue = null
        return {
          pumpId: pump.id,
          name: pump.name,
          opening,
          closing,
          volume,
          price: null,
          revenue: null,
          error,
        }
      }
    })
  )

  const productIds = stockRows.map((row) => row.productId)
  const historyRows =
    productIds.length > 0
      ? await prisma.sellingPriceHistory.findMany({
          where: {
            productId: { in: productIds },
            effectiveAt: { lte: shift.endTime },
          },
          orderBy: { effectiveAt: "desc" },
        })
      : []
  const priceOnDateByProduct = new Map<number, number>()
  for (const row of historyRows) {
    if (!priceOnDateByProduct.has(row.productId)) {
      priceOnDateByProduct.set(row.productId, Number(row.price))
    }
  }

  const shopLines: ShiftClosePreviewShopLine[] = stockRows.map((row) => {
    const opening = Number(row.openingQty)
    const received = Number(row.receivedQty)
    const closing = Number(row.closingQty)
    const sold = round3(opening + received - closing)
    const sellingPrice =
      priceOnDateByProduct.get(row.productId) ?? Number(row.product.sellingPrice)
    return {
      productId: row.productId,
      productName: row.product.name,
      opening,
      received,
      closing,
      sold,
      sellingPrice,
      value: round2(sold * sellingPrice),
    }
  })
  const negativeLines = shopLines.filter((line) => line.sold < 0)
  if (negativeLines.length > 0) {
    blockers.push("Shop stock contains negative sold quantities")
  }

  const dayStart = startOfLocalDay(shift.date)
  const dayEnd = new Date(dayStart.getTime() + DAY_MS)
  const dipRows = await prisma.tankLevelReading.findMany({
    where: { measuredAt: { gte: dayStart, lt: dayEnd } },
    orderBy: { measuredAt: "desc" },
  })
  const latestDipByTank = new Map<number, (typeof dipRows)[number]>()
  for (const row of dipRows) {
    if (!latestDipByTank.has(row.tankId)) latestDipByTank.set(row.tankId, row)
  }

  const dipsToday = tanks.flatMap((tank) => {
    const dip = latestDipByTank.get(tank.id)
    if (!dip) return []
    const theoretical =
      dip.theoreticalQuantityAtTime !== null
        ? Number(dip.theoreticalQuantityAtTime)
        : tank.theoreticalQuantity !== null
          ? Number(tank.theoreticalQuantity)
          : null
    const variance =
      theoretical !== null ? round3(Number(dip.quantity) - theoretical) : null
    return [
      {
        tankId: tank.id,
        measuredAt: dip.measuredAt.toISOString(),
        variance,
        withinTolerance:
          variance !== null
            ? varianceWithinTolerance(variance, {
                capacity:
                  tank.capacity !== null ? Number(tank.capacity) : null,
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
      },
    ]
  })
  if (dipsToday.length === 0) {
    warnings.push("No tank dip recorded today")
  }

  return {
    shiftId,
    pumps: previewPumps,
    fuelTotal: {
      volume: round3(fuelVolume),
      revenue: fuelRevenue === null ? null : round2(fuelRevenue),
      error: fuelError,
    },
    shop: {
      lines: shopLines,
      expectedTotal: round2(
        shopLines.reduce((sum, line) => sum + line.value, 0)
      ),
      negativeLines,
    },
    dipsToday,
    blockers,
    warnings,
  }
}
