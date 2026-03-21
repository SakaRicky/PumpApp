import { Role } from "@pumpapp/shared"

/**
 * Workers on a shift may not have a login. Shift close requires both fuel-side and
 * shop-side coverage, detected by **login role** (PUMPIST / SALE) or **designation**
 * (e.g. Pumpist, Shop) so operations are not blocked when RBAC roles are still USER.
 */
export type WorkerForShiftCoverage = {
  designation: string | null
  user: { role: Role } | null
}

const norm = (s: string | null | undefined): string => (s ?? "").toLowerCase()

/** Fuel / pump side: PUMPIST account, or designation suggesting pump work (e.g. Pumpist). */
export const coversFuelSide = (worker: WorkerForShiftCoverage): boolean => {
  if (worker.user?.role === Role.PUMPIST) return true
  const d = norm(worker.designation)
  return /\bpump/.test(d)
}

/** Shop side: SALE account, or designation suggesting shop/counter (e.g. Shop, cashier). */
export const coversShopSide = (worker: WorkerForShiftCoverage): boolean => {
  if (worker.user?.role === Role.SALE) return true
  const d = norm(worker.designation)
  return /\bshop\b/.test(d) || /\bcashier\b/.test(d)
}
