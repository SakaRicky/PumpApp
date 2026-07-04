import { prisma } from "../db.js"

/**
 * Shop sales total from shift stock snapshot:
 * sum of (openingQty + receivedQty - closingQty) * selling price.
 *
 * Each line is valued at the selling price effective on the shift date
 * (latest SellingPriceHistory row with effectiveAt ≤ shift date); products
 * with no history row by then fall back to their current sellingPrice.
 */
export const getShopSalesTotalFromShiftStock = async (
  shiftId: number
): Promise<number> => {
  const rows = await prisma.shiftProductStock.findMany({
    where: { shiftId },
    include: { product: true },
  })
  if (rows.length === 0) return 0

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  const priceDate = shift ? shift.endTime : new Date()

  const productIds = rows.map((row) => row.productId)
  const historyRows = await prisma.sellingPriceHistory.findMany({
    where: { productId: { in: productIds }, effectiveAt: { lte: priceDate } },
    orderBy: { effectiveAt: "desc" },
  })
  const priceOnDateByProduct = new Map<number, number>()
  for (const h of historyRows) {
    if (!priceOnDateByProduct.has(h.productId)) {
      priceOnDateByProduct.set(h.productId, Number(h.price))
    }
  }

  let total = 0
  for (const row of rows) {
    const opening = Number(row.openingQty)
    const received = Number(row.receivedQty)
    const closing = Number(row.closingQty)
    const soldQty = opening + received - closing
    const price =
      priceOnDateByProduct.get(row.productId) ?? Number(row.product.sellingPrice)
    total += soldQty * price
  }

  return Math.round(total * 100) / 100
}
