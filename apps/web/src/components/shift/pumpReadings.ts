export type PumpReadingGridRow = {
  pumpId: number
  pumpName: string
  readingId?: number
  workerName: string | null
  openingReading: string
  closingReading: string
  recentAverageVolume?: number | null
  volumeCeiling?: number | null
}

export const getPumpReadingVolume = (
  row: PumpReadingGridRow
): number | null => {
  const opening = Number(row.openingReading)
  const closing = Number(row.closingReading)
  if (
    row.openingReading.trim() === "" ||
    row.closingReading.trim() === "" ||
    Number.isNaN(opening) ||
    Number.isNaN(closing)
  ) {
    return null
  }
  return closing - opening
}
