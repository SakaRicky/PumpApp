# Gap Analysis — PumpApp vs `PUMPPRO_AGENT_README.md` (v1 spec)

**Date:** 2026-07-03 · **Baseline at audit:** lint ✓ · build ✓ · 143/143 tests ✓ (branch `main`, c212ed5)

Statuses: ✅ exists and conforms · 🟡 exists but diverges (divergence + decision noted) · ❌ missing (to build).

**Governing rule (spec §0.3):** where the existing codebase diverges *reasonably*, the codebase convention
wins and the spec is adapted; where a **Domain Invariant** (spec §2) is violated, the spec wins.
This repo also has its own finalized decisions in `docs/DOMAIN-DECISIONS.md` and `docs/OPERATIONS.md`,
which pre-date this spec and were treated as the codebase convention.

---

## 1. Global architectural decisions (kept — spec adapted)

| Spec | Repo | Decision |
|---|---|---|
| Drizzle ORM, UUID PKs | **Prisma 6**, `Int` autoincrement PKs | 🟡 Keep Prisma/Int. Consistency with codebase beats spec. |
| `employees` (attendant/seller, no login) | **`Worker`** (free-text `designation`, no login) + `User` 1:1 optional | 🟡 Equivalent. Keep `Worker`. |
| Roles `manager` / `assistant` | Roles `ADMIN` / `USER` (+`SALE`, `PUMPIST`) | 🟡 `ADMIN` ⇔ manager, `USER` ⇔ assistant. Keep. |
| Money as `BIGINT` XAF | `Decimal(10,2)` columns, JS `number` + `roundMoney` | 🟡 Keep `Decimal`. Postgres NUMERIC is exact (no IEEE floats at rest), which satisfies the *intent* of invariant 2. XAF amounts are integers in practice; a full BIGINT migration would churn every layer for no behavioral gain. Flagged as tech-debt: money math in TS uses `number` — safe for integer XAF ≤ 2^53 but multiplication `volume × price` passes through floats before rounding. |
| Split shifts: `attendant_shifts` + `shop_shifts` | **One `Shift`** covering fuel + shop, many workers via `ShiftWorker`, one `ShiftReconciliationSummary` per shift | 🟡 Keep the unified shift. This is a finalized decision (`docs/DOMAIN-DECISIONS.md`): reconciliation is per shift (shop + fuel + cash), cash accountability is per worker via `CashHandIn.workerId`. |
| Pumps → nozzles → meters | `Pump` with readings directly (no nozzle/meter entities) | 🟡 Keep. Station's pumps are single-nozzle; the meter abstraction is not needed for v1. Consequence: **rollover / meter-replacement flows are absent** (see §4). |
| No POS; shop sales derived from counts | Same philosophy: `ShiftProductStock` (opening/received/closing) → derived total; `ShopSale`/`ShopSaleItem` reserved for Phase 2 | ✅ |

## 2. Domain invariants (spec §2) — the part where the spec wins

| # | Invariant | Status | Action |
|---|---|---|---|
| 1 | **Append-only events journal** for every state change | ❌ No `events` table anywhere | **Build.** New `Event` model (type, actor, worker, payload JSONB, correctsEventId) + service; wire into mutating flows (shift status, readings, cash hand-ins, reconciliation, deliveries, prices, weekly close); `GET /events` audit endpoint. DB role hardening (REVOKE UPDATE/DELETE) documented, applied at deploy time. |
| 2 | XAF integer / no float money | 🟡 See §1 (Decimal kept) | Log only. Validation already restricts inputs; XAF values are whole numbers in practice. |
| 3 | **Closed means locked — rejected at API layer** | ❌ **Violated.** Locking is UI-only (`canEditPumpReadings` in `ShiftsPage.tsx`). API accepts create/update of pump readings, cash hand-ins and product stock on `RECONCILED` shifts | **Fix.** Enforce shift-status guards in pump-reading, cash-hand-in and shift-stock write paths. |
| 4 | Monotonic meter readings (+rollover/replacement exceptions) | 🟡 `closing ≥ opening` enforced; **no rollover / replacement path** | Keep the guard; rollover deferred (see §9 — rare event, admin can correct via reading update + event trail once journal exists). |
| 5 | Fuel reconciles at tank level; cash at worker level | 🟡 Cash: ✓ per-worker `CashHandIn`. Tank: theoretical vs actual tracked (`Tank.theoreticalQuantity`, `TankLevelReading`), but **no tolerance verdict / confirmed tank-reconciliation record** | Partial build (see §4 fuel). |
| 6 | Recording ≠ reconciling; surface pending lag | 🟡 Statuses exist (`CLOSED` vs `RECONCILED`) but **nothing surfaces the pending queue** | **Build** into dashboard (§6). |
| 7 | Shop sales derived from counts | ✅ `soldQty = opening + received − closing`, valued at `sellingPrice` (`shopShiftRevenue.ts`) | Negative-sold guard exists at close. |
| 8 | Effective-dated prices | 🟡 Fuel: ✓ `FuelPriceHistory` (range-based, unique per date). Product cost: ✓ `PurchasePriceHistory`. Product **selling** price: single mutable column | Keep for v1 — shop prices are owner-set and shift totals are computed at close-time; documented limitation. |
| 9 | Handover confirmation (closing N pre-fills opening N+1) | 🟡 Opening qty pre-fill exists in shift stock entry; **no seller-confirmation event** | Deferred; weekly physical close with the seller (`WeeklyInventoryClose`) is the business's authoritative confirmation (per `docs/OPERATIONS.md`). |
| 10 | Every event has actor + subject employee | 🟡 Write models carry `recordedById` / `workerId`; no unified journal | Solved by invariant-1 build. |

## 3. Data model (spec §4)

| Spec entity | Repo equivalent | Status |
|---|---|---|
| users, employees | `User`, `Worker` | ✅ (naming divergence, kept) |
| fuel_types, tanks, pumps | `FuelType`, `Tank`, `Pump` | ✅ (`Tank.capacity`, theoretical/actual quantity; **no per-tank dip tolerance fields** → 🟡, add if tank-reconciliation verdicts are built) |
| nozzles, meters | — | 🟡 intentionally absent (§1) |
| shop_products, prices | `Product`+`Category`, `FuelPriceHistory`, `PurchasePriceHistory` | 🟡 (§2 row 8) |
| settings | `Setting` key/value JSONB + `GET/PUT /settings` (journaled) | ✅ built (P5) |
| **events** | — | ❌ **build now** |
| attendant_shifts / nozzle_shift_readings | `Shift`+`ShiftPumpAssignment`+`PumpReading` | 🟡 kept (§1) |
| fuel_deliveries, tank_dips | `FuelDelivery`, `TankLevelReading` | ✅ |
| tank_reconciliations | `TankLevelReading` snapshots + per-tank `dipToleranceLiters`/`dipTolerancePct` + verdicts on dashboard & variance report | ✅ built (P5; no separate confirmed-status entity — verdicts are derived) |
| cash_reconciliations | `ShiftReconciliationSummary` (richer: source-tracked shop totals, overrides with reasons, server-derived discrepancy) | ✅ |
| shop_shifts / counts / movements / lines | `ShiftProductStock` (+`receivedQty`), derived totals | 🟡 kept; per-movement rows (damage/return) not modeled — folded into `receivedQty`/counts per the shop-book reality |
| shortage_ledger | `WeeklyInventoryClose.enforcedShortfall` (charges) + `ShortageSettlement` (settlements) + running balance per worker (`/shortages`, Workers-page ledger) | ✅ built (P5) |
| expenses, cash_deposits, safe balance | `Expense`, `CashDeposit` + `getSafeBalance()` projection (dashboard + Caisse & trésorerie page); all writes journaled | ✅ built (P3) |

## 4. API surface (spec §5)

✅ Auth (JWT + role guard), users, workers, categories, products, fuel-types, tanks, pumps,
fuel-prices, purchase-prices, fuel-deliveries, tank level readings, shifts (open/close with
transition rules), pump-readings, cash-hand-ins, reconciliation (create/update, server-derived
discrepancy, auto-`RECONCILED`), weekly-inventory-closes (with CSV of count lines).

✅ Since built: `GET /dashboard` (incl. safe balance + tolerance verdicts) · `GET /events` · `/expenses` CRUD ·
`/cash-deposits` CRUD · `GET /reports/{shifts,daily,tank-variance}` with `?format=csv` · `GET/POST /shortages`
(+settlements) · `GET/PUT /settings` · `GET /products/:id/selling-prices`.
❌ Still missing: rollover/replace-meter (waived, §1).

## 5. Screens (spec §6)

✅ Login, Shifts (open/close wizard incl. readings, stock entry, cash hand-ins), Reconciliation
(incl. batching pending shifts), Products/Categories, Master data (tanks/pumps/fuel types/prices),
Workers, Users, Weekly inventory. i18n FR/EN present with FR strings throughout.

❌ **Dashboard is a stub** (`HomePage.tsx`) — no pending-reconciliation queue (the spec's #1 widget), no today
stats, no tank-level bars. ❌ **Reports is a stub** (`ReportsPage.tsx`). ❌ No audit-log viewer (blocked on events).

## 6. Algorithms (spec §7) & tests

✅ tested: litres per reading (normal case), price-on-date, shop derived sales, discrepancy math,
worker coverage. 🟡 untested/missing: rollover/replacement (waived), tank tolerance verdict,
safe-balance projection, cumulative variance series (blocked on missing features).

## 7. Work plan derived from this analysis (phase order)

1. **P1 — Invariant fixes (spec wins):**
   a. API-layer locking of reconciled shifts (readings, cash hand-ins, shift stock). ✅ *this change-set*
   b. `Event` journal: schema + migration + service + wiring into mutating services + `GET /events`. ✅ *this change-set*
2. **P2 — Dashboard:** `GET /dashboard` (pending reconciliations with aging, today's fuel litres/revenue,
   shop revenue, tank levels vs capacity, recent discrepancies) + `HomePage` UI. ✅ *this change-set*
3. **P3 — Money:** expenses + cash deposits + safe-balance projection (+ dashboard tiles). ✅ *done*
4. **P4 — Reports:** shift/day revenue & discrepancy reports with `?format=csv`; tank variance history chart (leak detector); audit-log viewer over `/events`. ✅ *done*
5. **P5:** shortage ledger settlements (charges = weekly-close enforced shortfalls, running balance per worker, settle from Workers page), `Setting` key/value entity, tank dip tolerances (`dipToleranceLiters`/`dipTolerancePct`, absolute-OR-percentage verdict on dashboard + variance report), product selling-price history (auto-appended on price change; shift stock valued at price-on-shift-date with fallback to current price). ✅ *done*

All phases P0–P5 of this plan are implemented. Remaining spec gaps are the deliberately
waived items (§1–§3): nozzle/meter model with rollover/replacement, BIGINT money columns,
and per-movement shop rows — each recorded above with its rationale.
