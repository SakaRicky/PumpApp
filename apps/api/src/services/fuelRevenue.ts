import { prisma } from "../db.js"
import { getPriceForShift } from "../controllers/fuelPriceHistoryController.js"

type PumpVolumeRevenue = {
  pumpId: number
  volume: number
  revenue: number
}

type ShiftFuelRevenue = {
  perPump: PumpVolumeRevenue[]
  totalVolume: number
  totalRevenue: number
}

export const getVolumeAndRevenueForShift = async (
  shiftId: number
): Promise<ShiftFuelRevenue> => {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new Error("Shift not found")
  }

  const readings = await prisma.pumpReading.findMany({
    where: { shiftId },
    include: {
      pump: {
        include: {
          tank: true,
        },
      },
    },
  })

  const perPump: PumpVolumeRevenue[] = []
  let totalVolume = 0
  let totalRevenue = 0

  for (const reading of readings) {
    const opening = Number(reading.openingReading)
    const closing = Number(reading.closingReading)
    const volume = closing - opening

    const fuelTypeId = reading.pump.tank?.fuelTypeId
    if (!fuelTypeId) {
      throw new Error(
        `Pump ${reading.pumpId} is not linked to a fuel type via tank`
      )
    }

    const price = await getPriceForShift(fuelTypeId, shift.date)
    const revenue = volume * price.pricePerUnit

    perPump.push({
      pumpId: reading.pumpId,
      volume,
      revenue,
    })
    totalVolume += volume
    totalRevenue += revenue
  }

  return {
    perPump,
    totalVolume,
    totalRevenue,
  }
}

