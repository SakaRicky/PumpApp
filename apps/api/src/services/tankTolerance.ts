export type ToleranceConfig = {
  capacity: number | null
  dipToleranceLiters: number | null
  dipTolerancePct: number | null
}

/**
 * Verdict of a dip variance against the tank's configured tolerance.
 * Within tolerance if |variance| passes the absolute check OR the
 * percentage-of-capacity check (whichever are configured). Returns null when
 * no check is configurable (no tolerance set, or pct set without capacity).
 */
export const varianceWithinTolerance = (
  variance: number,
  tank: ToleranceConfig
): boolean | null => {
  const abs = Math.abs(variance)
  const checks: boolean[] = []
  if (tank.dipToleranceLiters !== null) {
    checks.push(abs <= tank.dipToleranceLiters)
  }
  if (
    tank.dipTolerancePct !== null &&
    tank.capacity !== null &&
    tank.capacity > 0
  ) {
    checks.push(abs <= (tank.dipTolerancePct / 100) * tank.capacity)
  }
  if (checks.length === 0) return null
  return checks.some(Boolean)
}
