## PumpApp Feature Slices (S1–S8)

This document summarizes the vertical feature slices for PumpApp, based on the agent workflow plan (`pumpapp_agent_workflow_plan_58c88a44.plan.md`). For how reconciliation and shop counts fit **daily vs weekly** operations, **daily missing cash**, **weekly physical enforcement**, and **monthly payroll** in the field, see [OPERATIONS.md](OPERATIONS.md) and [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md#operational-vs-app-reconciliation-payroll).

Each slice is intended to be implemented as a **vertical slice**: schema (if needed) → migrations → shared types/Zod → API → tests → UI.

---

## S1 – Authentication & User/Worker Management

- **Scope**:
  - `POST /auth/login` with JWT issuance and decoding.
  - `User` and `Worker` CRUD (admin-only where appropriate).
  - Role-based guards for protected routes.
- **Layers**:
  - **Schema**: refine `User`, `Worker`, `Role`, `UserType` as needed; migrations.
  - **Shared**: auth request/response types, login Zod schema, role enum.
  - **API**: auth controller, JWT middleware, user/worker routes and validation.
  - **Tests**: login success/failure, role enforcement.
  - **UI**: login page, simple user list (admin), basic worker list.

---

## S2 – Products, Categories, Purchase Price History

- **Scope**:
  - Endpoints for `Category`, `Product`, `PurchasePriceHistory` (per `docs/API-DESIGN.md`).
  - Admin UI for managing categories/products and viewing purchase price history.
- **Layers**:
  - **Schema**: ensure `Category`, `Product`, `PurchasePriceHistory` match `docs/DATABASE.md`; migration.
  - **Shared**: DTOs and Zod schemas for categories, products, and purchase prices.
  - **API**: CRUD for categories/products; append-only purchase price history with “price increased” alert.
  - **Tests**: price history preservation, alert on price increase.
  - **UI**: product + category management pages; price history table with alert UI.

---

## S3 – Shifts & Workers on Shifts

- **Scope**:
  - `Shift` and `ShiftWorker` management.
  - Shift lifecycle with status transitions (`PLANNED → OPEN → CLOSED → RECONCILED`, with `RECONCILED → CLOSED` for admin redo).
  - Per-shift, per-product stock snapshots (digital replacement of the paper/Excel sheet).
  - Preconditions for closing shifts based on which domains (fuel / shop) are active on that shift.
- **Layers**:
  - **Schema**:
    - `Shift`, `ShiftWorker`, and `ShiftStatus` enum finalized.
    - `ShiftProductStock` model for per-shift per-product stock snapshots.
  - **Shared**:
    - DTOs and Zod schemas for shifts, ShiftWorker assignment, and shift stock snapshots.
  - **API**:
    - Shift CRUD.
    - Worker assignment/unassignment endpoints.
    - Bulk read/write endpoints for `ShiftProductStock` for a shift.
  - **Tests**:
    - Shift open/close flow and allowed status transitions.
    - Worker assignment invariants (no duplicates, only active workers, at least one worker before close).
    - Closure preconditions: fuel/pump coverage and shop coverage on assigned workers (**login role** PUMPIST/SALE and/or **designation** e.g. Pumpist/Shop); pump readings required. (Shop stock snapshot is **not** required to close for now; reconciliation may still require stock or `MANUAL` shop source.)
  - **UI**:
    - Shift list with filters.
    - Create/edit shift.
    - Assign workers to a shift.
    - Shift stock entry UI (smart table for entering closing counts, with pre-filled opening from previous shift).

---

## S4 – Pumps, Fuel Price History, Pump Readings

- **Scope**:
  - `Pump`, `FuelPriceHistory`, `PumpReading` and fuel revenue computation. Schema and UI support **Pump–Tank** link (optional `tankId` on Pump); see [DATABASE.md](DATABASE.md) and [FUEL-TRACKING.md](FUEL-TRACKING.md) for FuelType and Tank.
- **Layers**:
  - **Schema**: confirm `Pump`, `FuelPriceHistory` (date ranges), `PumpReading` match `docs/DOMAIN-DECISIONS.md`; Pump has optional `tankId` → Tank (FuelType and Tank exist per S4b or prior).
  - **Shared**: fuel price and pump reading DTOs and Zod schemas.
  - **API**: pumps CRUD (create/update may include `tankId`); fuel price history; pump readings per shift; expose computed volume & fuel revenue.
  - **Tests**: price lookup by date range; volume and revenue calculations.
  - **UI**: manage pumps; manage fuel prices; per-shift pump reading entry UI.

---

## S4b – Fuel types, tanks, deliveries

- **Scope**:
  - FuelType and Tank CRUD; Pump → Tank assignment; FuelDelivery recording; computation or display of theoretical quantity; optional actual quantity entry.
- **Layers**:
  - **Schema**: FuelType, Tank, FuelDelivery, Pump.tankId (see [DATABASE.md](DATABASE.md)).
  - **Shared**: DTOs and Zod schemas for fuel types, tanks, fuel deliveries.
  - **API**: fuel-types CRUD; tanks CRUD; tank deliveries (e.g. `GET /api/tanks/:tankId/deliveries`, `POST /api/tanks/:tankId/deliveries`); expose theoretical/actual quantity where needed.
  - **Tests**: tank quantity formula; delivery effect on theoretical quantity.
  - **UI**: manage fuel types and tanks; record deliveries; view theoretical vs actual quantity.
- **Note**: S4b can follow S4 so pump readings exist for fuel_sold per tank; implementation order may vary.

---

## S5 – Cash Hand-In & Shift Reconciliation (Phase 1)

- **Scope**:
  - `CashHandIn` and `ShiftReconciliationSummary`.
  - Phase 1 reconciliation: **shop line** + **fuel line** + **cash line** + **derived discrepancy**, aligned with [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md) and [OPERATIONS.md](OPERATIONS.md).
- **Product rules** (see DOMAIN-DECISIONS / OPERATIONS):
  - Reconciliation **create/update** only when shift status is **`CLOSED`**; successful save sets shift to **`RECONCILED`**.
  - **Shop total**: support **`SHIFT_SUMMARY_ENTRY`** (from `ShiftProductStock` × selling prices) **and** **`MANUAL`** (with reason) for weekly-count realities.
  - **Fuel total**: use S4 computation; **admin override** with reason.
  - **Cash total**: default **sum of `CashHandIn`**; **admin override** with audit note (and ideally a machine-readable “source” if schema adds it).
  - **`CashHandIn`**: **`workerId` required**; recording **ADMIN-only**.
  - **`discrepancyAmount`**: always **server-derived**; UI labels **short** vs **over** (sign: positive = short, negative = over).
- **Layers**:
  - **Schema**: `CashHandIn`, `ShiftReconciliationSummary` (optional extra fields later for cash/fuel override audit, if not using `notes` only).
  - **Shared**: DTOs and Zod schemas for cash hand-in and reconciliation.
  - **API**: cash hand-in endpoints; reconciliation endpoints; discrepancy computation using:
    - shop total (`SHIFT_SUMMARY_ENTRY` or `MANUAL`),
    - fuel totals from S4,
    - cash (sum of hand-ins or overridden total).
  - **Tests**: discrepancy formula and sign; `shopSalesSource` logic; override paths; CLOSED-only guard; transition to `RECONCILED`.
  - **UI**: per-shift reconciliation (shop, fuel, cash, discrepancy with short/over presentation); list/add cash hand-ins with worker.

---

## S6 – Fixed Costs & Profit Analysis

- **Scope**:
  - `FixedCost` model and profit reporting that includes fixed costs.
- **Layers**:
  - **Schema**: `FixedCost` model (monthly amount, effective month, notes).
  - **Shared**: fixed cost DTOs and profit report shapes.
  - **API**: fixed-cost CRUD; profit report endpoints using shift summaries + fixed costs.
  - **Tests**: profit math and period filters.
  - **UI**: fixed cost management UI; basic profit report screen.

---

## S7 – Reporting & Analytics

- **Scope**:
  - Reporting endpoints and UIs beyond what previous slices provide.
- **Layers**:
  - **API**: shift/day reports, discrepancy reports, fuel reports, and other summaries per `docs/API-DESIGN.md`.
  - **Tests**: report filters, aggregates, and edge cases.
  - **UI**: report pages using TanStack Table (filtering, sorting, pagination).

---

## S8 – Phase 2 Shop Sales & Inventory (Transactional)

- **Scope**:
  - Per-transaction shop sales and inventory updates.
  - Reconciliation that can use `TRANSACTIONAL_SYSTEM_TOTAL` as the shop sales source.
- **Layers**:
  - **Schema**: finalize `ShopSale` and `ShopSaleItem`; migrations if fields evolve.
  - **Shared**: sale DTOs and Zod schemas.
  - **API**: per-transaction shop sale endpoints; wire into stock and reconciliation.
  - **Tests**: sale creation; stock decrement; reconciliation using transactional totals.
  - **UI**: transactional shop sales entry (basic POS-style flow) integrated with inventory.
