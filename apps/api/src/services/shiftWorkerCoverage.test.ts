import { describe, it, expect } from "vitest"
import { Role } from "@pumpapp/shared"
import { coversFuelSide, coversShopSide } from "./shiftWorkerCoverage.js"

describe("shiftWorkerCoverage", () => {
  it("coversFuelSide from PUMPIST login role", () => {
    expect(
      coversFuelSide({
        designation: null,
        user: { role: Role.PUMPIST },
      })
    ).toBe(true)
  })

  it("coversFuelSide from Pumpist designation with USER login", () => {
    expect(
      coversFuelSide({
        designation: "Pumpist",
        user: { role: Role.USER },
      })
    ).toBe(true)
  })

  it("coversShopSide from SALE login role", () => {
    expect(
      coversShopSide({
        designation: null,
        user: { role: Role.SALE },
      })
    ).toBe(true)
  })

  it("coversShopSide from Shop designation with USER login", () => {
    expect(
      coversShopSide({
        designation: "Shop",
        user: { role: Role.USER },
      })
    ).toBe(true)
  })

  it("does not treat plain USER without keywords as fuel or shop", () => {
    const w = { designation: "Manager", user: { role: Role.USER } }
    expect(coversFuelSide(w)).toBe(false)
    expect(coversShopSide(w)).toBe(false)
  })
})
