import { describe, it, expect } from "vitest"
import { varianceWithinTolerance } from "./tankTolerance.js"

describe("varianceWithinTolerance", () => {
  it("returns null when no tolerance is configured", () => {
    expect(
      varianceWithinTolerance(-50, {
        capacity: 10000,
        dipToleranceLiters: null,
        dipTolerancePct: null,
      })
    ).toBeNull()
  })

  it("checks the absolute tolerance", () => {
    const tank = {
      capacity: null,
      dipToleranceLiters: 30,
      dipTolerancePct: null,
    }
    expect(varianceWithinTolerance(-25, tank)).toBe(true)
    expect(varianceWithinTolerance(25, tank)).toBe(true)
    expect(varianceWithinTolerance(-31, tank)).toBe(false)
  })

  it("checks the percentage tolerance against capacity", () => {
    const tank = {
      capacity: 10000,
      dipToleranceLiters: null,
      dipTolerancePct: 0.5, // 50 L
    }
    expect(varianceWithinTolerance(-49, tank)).toBe(true)
    expect(varianceWithinTolerance(-51, tank)).toBe(false)
  })

  it("passes when either configured check passes (absolute OR pct)", () => {
    const tank = {
      capacity: 10000,
      dipToleranceLiters: 20,
      dipTolerancePct: 0.5, // 50 L
    }
    // exceeds absolute (20) but within pct (50) → within tolerance
    expect(varianceWithinTolerance(-40, tank)).toBe(true)
    // exceeds both → flagged
    expect(varianceWithinTolerance(-60, tank)).toBe(false)
  })

  it("returns null when pct is set but capacity is unknown", () => {
    expect(
      varianceWithinTolerance(-10, {
        capacity: null,
        dipToleranceLiters: null,
        dipTolerancePct: 1,
      })
    ).toBeNull()
  })
})
