## PumpApp Feature Slices (S1–S8)

This document summarizes the vertical feature slices for PumpApp, based on the agent workflow plan (`pumpapp_agent_workflow_plan_58c88a44.plan.md`).

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
  - Ability to create, open/close, and assign workers to shifts.
- **Layers**:
  - **Schema**: `Shift`, `ShiftWorker`, and `ShiftStatus` enum finalized.
  - **Shared**: shift DTOs and Zod schemas.
  - **API**: shift CRUD; worker assignment/unassignment endpoints.
  - **Tests**: open/close flow; worker assignment invariants.
  - **UI**: shift list; create/edit shift; assign workers to a shift.

---

## S4 – Pumps, Fuel Price History, Pump Readings

- **Scope**:
  - `Pump`, `FuelPriceHistory`, `PumpReading` and fuel revenue computation.
- **Layers**:
  - **Schema**: confirm `Pump`, `FuelPriceHistory` (date ranges), `PumpReading` match `docs/DOMAIN-DECISIONS.md`.
  - **Shared**: fuel price and pump reading DTOs and Zod schemas.
  - **API**: pumps CRUD; fuel price history; pump readings per shift; expose computed volume & fuel revenue.
  - **Tests**: price lookup by date range; volume and revenue calculations.
  - **UI**: manage pumps; manage fuel prices; per-shift pump reading entry UI.

---

## S5 – Cash Hand-In & Shift Reconciliation (Phase 1)

- **Scope**:
  - `CashHandIn` and `ShiftReconciliationSummary`.
  - Phase 1 reconciliation using **shift-end shop total**, fuel totals, cash totals, and discrepancy.
- **Layers**:
  - **Schema**: `CashHandIn`, `ShiftReconciliationSummary` with shop sales source fields.
  - **Shared**: DTOs and Zod schemas for cash hand-in and reconciliation.
  - **API**: cash hand-in endpoints; reconciliation endpoints; discrepancy computation using:
    - shop total (SHIFT_SUMMARY_ENTRY or MANUAL),
    - fuelTotals from S4,
    - cash handed in.
  - **Tests**: discrepancy formula; `shopSalesSource` logic; override paths.
  - **UI**: per-shift reconciliation page (enter shop total, view fuel & cash totals, see discrepancy).

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
