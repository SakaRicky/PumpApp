import { prisma } from "../db.js"

/**
 * Shop sales total from shift stock snapshot: sum of (openingQty - closingQty) * sellingPrice.
 */
export const getShopSalesTotalFromShiftStock = async (
  shiftId: number
): Promise<number> => {
  const rows = await prisma.shiftProductStock.findMany({
    where: { shiftId },
    include: { product: true },
  })

  let total = 0
  for (const row of rows) {
    const opening = Number(row.openingQty)
    const closing = Number(row.closingQty)
    const soldQty = opening - closing
    const price = Number(row.product.sellingPrice)
    total += soldQty * price
  }

  return Math.round(total * 100) / 100
}
