import {
  ShopSalesSource,
  ShiftStatus,
  type ReconciliationGetResponse,
  type ReconciliationSummaryResponse,
  type ReconciliationSummaryWriteCreateInput,
  type ReconciliationSummaryWriteUpdateInput,
} from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"
import { getVolumeAndRevenueForShift } from "./fuelRevenue.js"
import { getShopSalesTotalFromShiftStock } from "./shopShiftRevenue.js"

const roundMoney = (n: number): number => Math.round(n * 100) / 100

type Hints = {
  computedShopSalesTotal: number
  computedFuelSalesTotal: number | null
  sumCashHandIns: number
  fuelComputationError: string | null
}

const sumCashHandInsForShift = async (shiftId: number): Promise<number> => {
  const agg = await prisma.cashHandIn.aggregate({
    where: { shiftId },
    _sum: { amount: true },
  })
  return roundMoney(Number(agg._sum.amount ?? 0))
}

export const getReconciliationHints = async (
  shiftId: number
): Promise<Hints> => {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  const computedShopSalesTotal = roundMoney(
    await getShopSalesTotalFromShiftStock(shiftId)
  )
  const sumCashHandIns = await sumCashHandInsForShift(shiftId)

  let computedFuelSalesTotal: number | null = null
  let fuelComputationError: string | null = null
  try {
    const fr = await getVolumeAndRevenueForShift(shiftId)
    computedFuelSalesTotal = roundMoney(fr.totalRevenue)
  } catch (e) {
    fuelComputationError =
      e instanceof Error ? e.message : "Could not compute fuel revenue"
  }

  return {
    computedShopSalesTotal,
    computedFuelSalesTotal,
    sumCashHandIns,
    fuelComputationError,
  }
}

export const getReconciliationGetResponse = async (
  shiftId: number
): Promise<ReconciliationGetResponse> => {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }

  const hints = await getReconciliationHints(shiftId)
  const row = await prisma.shiftReconciliationSummary.findUnique({
    where: { shiftId },
  })

  return {
    summary: row ? mapRowToResponse(row, hints) : null,
    ...hints,
  }
}

type ShopResolved = {
  effectiveShopSalesTotal: number
  manualShopSalesTotal: number | null
  manualShopSalesReason: string | null
  systemShopSalesTotal: number | null
}

const resolveShopLineCreate = async (
  shiftId: number,
  body: ReconciliationSummaryWriteCreateInput
): Promise<ShopResolved> => {
  if (body.shopSalesSource === ShopSalesSource.SHIFT_SUMMARY_ENTRY) {
    const stockCount = await prisma.shiftProductStock.count({
      where: { shiftId },
    })
    if (stockCount === 0) {
      throw new AppError(
        "No shop stock snapshot for this shift; enter stock or use MANUAL shop source",
        422,
        ErrorCode.VALIDATION_ERROR
      )
    }
    const effective = roundMoney(await getShopSalesTotalFromShiftStock(shiftId))
    return {
      effectiveShopSalesTotal: effective,
      manualShopSalesTotal: null,
      manualShopSalesReason: null,
      systemShopSalesTotal: null,
    }
  }

  return {
    effectiveShopSalesTotal: roundMoney(body.manualShopSalesTotal!),
    manualShopSalesTotal: roundMoney(body.manualShopSalesTotal!),
    manualShopSalesReason: body.manualShopSalesReason ?? null,
    systemShopSalesTotal: null,
  }
}

const resolveShopLineUpdate = async (
  shiftId: number,
  existing: {
    shopSalesSource: string
    manualShopSalesTotal: { toNumber: () => number } | null
    manualShopSalesReason: string | null
    effectiveShopSalesTotal: { toNumber: () => number }
  },
  body: ReconciliationSummaryWriteUpdateInput
): Promise<ShopResolved> => {
  const source = body.shopSalesSource ?? existing.shopSalesSource

  if (source === ShopSalesSource.TRANSACTIONAL_SYSTEM_TOTAL) {
    throw new AppError(
      "Transactional shop source is not supported in Phase 1",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  if (source === ShopSalesSource.SHIFT_SUMMARY_ENTRY) {
    const stockCount = await prisma.shiftProductStock.count({
      where: { shiftId },
    })
    if (stockCount === 0) {
      throw new AppError(
        "No shop stock snapshot for this shift; enter stock or use MANUAL shop source",
        422,
        ErrorCode.VALIDATION_ERROR
      )
    }
    const effective = roundMoney(await getShopSalesTotalFromShiftStock(shiftId))
    return {
      effectiveShopSalesTotal: effective,
      manualShopSalesTotal: null,
      manualShopSalesReason: null,
      systemShopSalesTotal: null,
    }
  }

  const manualTotal =
    body.manualShopSalesTotal ??
    (existing.manualShopSalesTotal
      ? existing.manualShopSalesTotal.toNumber()
      : NaN)
  const manualReason =
    body.manualShopSalesReason ?? existing.manualShopSalesReason ?? ""

  if (Number.isNaN(manualTotal) || manualReason.trim() === "") {
    throw new AppError(
      "Manual shop total and reason are required when shop source is MANUAL",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const rounded = roundMoney(manualTotal)
  return {
    effectiveShopSalesTotal: rounded,
    manualShopSalesTotal: rounded,
    manualShopSalesReason: manualReason,
    systemShopSalesTotal: null,
  }
}

type FuelResolved = {
  fuelSalesTotal: number
  fuelSalesOverrideReason: string | null
}

const resolveFuelLine = async (
  shiftId: number,
  fuelSalesTotal: number | undefined,
  fuelSalesOverrideReason: string | null | undefined
): Promise<FuelResolved> => {
  if (fuelSalesTotal !== undefined) {
    return {
      fuelSalesTotal: roundMoney(fuelSalesTotal),
      fuelSalesOverrideReason: fuelSalesOverrideReason?.trim() ?? null,
    }
  }

  try {
    const fr = await getVolumeAndRevenueForShift(shiftId)
    return {
      fuelSalesTotal: roundMoney(fr.totalRevenue),
      fuelSalesOverrideReason: null,
    }
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not compute fuel revenue"
    throw new AppError(
      `Cannot compute fuel sales: ${msg}. Fix pump/tank/pricing or provide fuelSalesTotal override with a reason.`,
      422,
      ErrorCode.VALIDATION_ERROR
    )
  }
}

type CashResolved = {
  cashHandedTotal: number
  cashHandedTotalOverrideReason: string | null
}

const resolveCashLine = async (
  shiftId: number,
  cashHandedTotal: number | undefined,
  cashHandedTotalOverrideReason: string | null | undefined
): Promise<CashResolved> => {
  if (cashHandedTotal !== undefined) {
    return {
      cashHandedTotal: roundMoney(cashHandedTotal),
      cashHandedTotalOverrideReason:
        cashHandedTotalOverrideReason?.trim() ?? null,
    }
  }

  const sum = await sumCashHandInsForShift(shiftId)
  return {
    cashHandedTotal: sum,
    cashHandedTotalOverrideReason: null,
  }
}

type SummaryRow = NonNullable<
  Awaited<ReturnType<typeof prisma.shiftReconciliationSummary.findUnique>>
>

const mapRowToResponse = (
  row: SummaryRow,
  hints: Hints
): ReconciliationSummaryResponse => ({
  id: row.id,
  shiftId: row.shiftId,
  shopSalesSource:
    row.shopSalesSource as ReconciliationSummaryResponse["shopSalesSource"],
  systemShopSalesTotal: row.systemShopSalesTotal
    ? row.systemShopSalesTotal.toNumber()
    : null,
  manualShopSalesTotal: row.manualShopSalesTotal
    ? row.manualShopSalesTotal.toNumber()
    : null,
  effectiveShopSalesTotal: row.effectiveShopSalesTotal.toNumber(),
  manualShopSalesReason: row.manualShopSalesReason,
  fuelSalesTotal: row.fuelSalesTotal.toNumber(),
  fuelSalesOverrideReason: row.fuelSalesOverrideReason,
  cashHandedTotal: row.cashHandedTotal.toNumber(),
  cashHandedTotalOverrideReason: row.cashHandedTotalOverrideReason,
  discrepancyAmount: row.discrepancyAmount.toNumber(),
  reviewedById: row.reviewedById,
  notes: row.notes,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  computedShopSalesTotal: hints.computedShopSalesTotal,
  computedFuelSalesTotal: hints.computedFuelSalesTotal,
  sumCashHandIns: hints.sumCashHandIns,
  fuelComputationError: hints.fuelComputationError,
})

export const createShiftReconciliation = async ({
  shiftId,
  userId,
  body,
}: {
  shiftId: number
  userId: number
  body: ReconciliationSummaryWriteCreateInput
}): Promise<ReconciliationSummaryResponse> => {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }
  if (shift.status !== ShiftStatus.CLOSED) {
    throw new AppError(
      "Reconciliation can only be created for a CLOSED shift",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const existing = await prisma.shiftReconciliationSummary.findUnique({
    where: { shiftId },
  })
  if (existing) {
    throw new AppError(
      "Reconciliation summary already exists for this shift",
      409,
      ErrorCode.CONFLICT
    )
  }

  const shop = await resolveShopLineCreate(shiftId, body)
  const fuel = await resolveFuelLine(
    shiftId,
    body.fuelSalesTotal,
    body.fuelSalesOverrideReason
  )
  const cash = await resolveCashLine(
    shiftId,
    body.cashHandedTotal,
    body.cashHandedTotalOverrideReason
  )

  const discrepancyAmount = roundMoney(
    shop.effectiveShopSalesTotal + fuel.fuelSalesTotal - cash.cashHandedTotal
  )

  await prisma.$transaction(async (tx) => {
    await tx.shiftReconciliationSummary.create({
      data: {
        shiftId,
        shopSalesSource: body.shopSalesSource,
        systemShopSalesTotal: shop.systemShopSalesTotal,
        manualShopSalesTotal: shop.manualShopSalesTotal,
        effectiveShopSalesTotal: shop.effectiveShopSalesTotal,
        manualShopSalesReason: shop.manualShopSalesReason,
        fuelSalesTotal: fuel.fuelSalesTotal,
        fuelSalesOverrideReason: fuel.fuelSalesOverrideReason,
        cashHandedTotal: cash.cashHandedTotal,
        cashHandedTotalOverrideReason: cash.cashHandedTotalOverrideReason,
        discrepancyAmount,
        notes: body.notes ?? null,
        reviewedById: userId,
      },
    })
    await tx.shift.update({
      where: { id: shiftId },
      data: { status: ShiftStatus.RECONCILED },
    })
  })

  const created = await prisma.shiftReconciliationSummary.findUnique({
    where: { shiftId },
  })
  if (!created) {
    throw new AppError(
      "Failed to load reconciliation",
      500,
      ErrorCode.INTERNAL_ERROR
    )
  }

  const hints = await getReconciliationHints(shiftId)
  return mapRowToResponse(created, hints)
}

export const updateShiftReconciliation = async ({
  shiftId,
  userId,
  body,
}: {
  shiftId: number
  userId: number
  body: ReconciliationSummaryWriteUpdateInput
}): Promise<ReconciliationSummaryResponse> => {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift) {
    throw new AppError("Shift not found", 404, ErrorCode.NOT_FOUND)
  }
  if (
    shift.status !== ShiftStatus.CLOSED &&
    shift.status !== ShiftStatus.RECONCILED
  ) {
    throw new AppError(
      "Reconciliation can only be updated when the shift is CLOSED or RECONCILED",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const existing = await prisma.shiftReconciliationSummary.findUnique({
    where: { shiftId },
  })
  if (!existing) {
    throw new AppError(
      "No reconciliation summary for this shift",
      404,
      ErrorCode.NOT_FOUND
    )
  }

  const shop = await resolveShopLineUpdate(shiftId, existing, body)
  const fuel = await resolveFuelLine(
    shiftId,
    body.fuelSalesTotal,
    body.fuelSalesOverrideReason
  )
  const cash = await resolveCashLine(
    shiftId,
    body.cashHandedTotal,
    body.cashHandedTotalOverrideReason
  )

  const discrepancyAmount = roundMoney(
    shop.effectiveShopSalesTotal + fuel.fuelSalesTotal - cash.cashHandedTotal
  )

  const shopSalesSource = body.shopSalesSource ?? existing.shopSalesSource

  await prisma.$transaction(async (tx) => {
    await tx.shiftReconciliationSummary.update({
      where: { shiftId },
      data: {
        shopSalesSource,
        systemShopSalesTotal: shop.systemShopSalesTotal,
        manualShopSalesTotal: shop.manualShopSalesTotal,
        effectiveShopSalesTotal: shop.effectiveShopSalesTotal,
        manualShopSalesReason: shop.manualShopSalesReason,
        fuelSalesTotal: fuel.fuelSalesTotal,
        fuelSalesOverrideReason: fuel.fuelSalesOverrideReason,
        cashHandedTotal: cash.cashHandedTotal,
        cashHandedTotalOverrideReason: cash.cashHandedTotalOverrideReason,
        discrepancyAmount,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        reviewedById:
          body.reviewedById !== undefined ? body.reviewedById : userId,
      },
    })
    await tx.shift.update({
      where: { id: shiftId },
      data: { status: ShiftStatus.RECONCILED },
    })
  })

  const updated = await prisma.shiftReconciliationSummary.findUnique({
    where: { shiftId },
  })
  if (!updated) {
    throw new AppError(
      "Failed to load reconciliation",
      500,
      ErrorCode.INTERNAL_ERROR
    )
  }

  const hints = await getReconciliationHints(shiftId)
  return mapRowToResponse(updated, hints)
}
