export type StockCountRow = {
  productId: number
  productName: string
  categoryName: string
  openingQty: string
  receivedQty: string
  closingQty: string
  sellingPrice: number
  closingSuggested?: boolean
}

export type ParsedStockCountRow = StockCountRow & {
  opening: number
  received: number
  closing: number
  sold: number
  revenue: number
  warning: boolean
}

export const deriveStockRow = (row: StockCountRow): ParsedStockCountRow => {
  const opening = Number(row.openingQty)
  const received = Number(row.receivedQty)
  const closing = Number(row.closingQty)
  const sold = opening + received - closing
  const revenue = sold * row.sellingPrice
  return {
    ...row,
    opening,
    received,
    closing,
    sold,
    revenue,
    warning: closing > opening + received || sold < 0,
  }
}
