## PumpPro — Requirements and Specifications

This file is a direct copy/condensed version of the PumpPro requirements provided at project kick-off. It is the **product source of truth**. If there is ever a conflict between code and this document, this document wins (unless explicitly superseded).

> Note: The original requirements text is long. This document keeps the original structure and key wording but may omit some non-essential prose for brevity. When in doubt, prefer the stricter interpretation.

---

### 1. Product overview

- **Name**: PumpPro (code name PumpApp).
- **Type**: Full-stack web application for managing a petrol station and its convenience store.
- **Core objective**: Help the owner/admin manage:
  - shop product sales and inventory,
  - fuel sales estimation from pump readings,
  - fuel inventory by tank (theoretical and optional actual), fuel deliveries into tanks, and theoretical vs actual quantity to support loss/discrepancy investigation,
  - shift/day reconciliation of expected sales vs cash handed in,
  - discrepancy tracking,
  - profitability (including fixed costs).

Key philosophy:

- correctness and auditability over convenience,
- explicit business rules,
- admin control over automated decisions.

### 2. Users and access

- **UserType**:
  - `SYSTEM_USER` — can log in.
  - `WORKER` — operational person, may not log in.
- **Roles** (fixed set): `ADMIN`, `USER`, `SALE`, `PUMPIST`.
- Only `SYSTEM_USER` accounts can authenticate.
- Admin-only actions must stay protected.

### 3. Scope

In scope:

- User & worker management.
- Product & category management.
- Inventory tracking (current stock, sale-driven updates).
- Shop sales recording (initially as shift-end totals, later per-transaction).
- Purchase price history (append-only).
- Manual selling price management.
- Pump management & readings.
- Shift management.
- Daily/shift sales summary & reconciliation.
- Discrepancy tracking.
- Reporting by period and dimensions (product, category, salesperson).
- Fixed cost recording.
- Profit analysis including fixed costs.

Explicitly out of scope:

- Payroll and salary deductions.
- Refunds and cancellations.
- Barcode scanning.
- External integrations.
- Automatic markup-based pricing.
- Stock loss/damage modules.
- Password reset & account recovery.
- Multi-language support.

### 4. Functional objectives (summary)

The system must allow the admin to:

- Maintain master data (products, categories, users, workers, pumps).
- Record or derive sales for shop and fuel.
- Track stock levels for shop products.
- Preserve historical purchase prices.
- Manage selling prices manually.
- Enter pump readings and derive fuel sold.
- Record cash handed in.
- Compare expected totals vs cash received.
- Identify discrepancies (by shift/day/worker).
- Run reports for configurable time ranges.
- Include fixed costs in profit analysis.

### 5. Major modules (summary)

- **Authentication & access control**: JWT, role-based, SYSTEM_USER only.
- **User & worker management**: separate concepts; workers may not log in.
- **Product & category**: CRUD, selling price, inventory fields.
- **Historical purchase price tracking**: append-only price history; alerts on increases.
- **Inventory management**: stock levels updated by shop sales; no explicit damage/theft tracking.
- **Shop sales recording**:
  - clarified to support **shift-end totals first**, later per-transaction.
  - sales auto-confirmed (no approval queue).
- **Pump management**: register pumps.
- **Pump reading / fuel sales estimation**: derive fuel sold from meter readings.
- **Fuel tank and delivery tracking**: tanks per fuel type, pump–tank link, delivery records, theoretical vs actual tank quantity for loss detection; see [FUEL-TRACKING.md](FUEL-TRACKING.md).
- **Shift management**: represent operational periods for reconciliation.
- **Daily/shift sales summary & reconciliation**: compare expected vs cash; show discrepancies.
- **Reporting & analytics**: by shift/day/week/month; filter by product, category, salesperson.
- **Fixed cost tracking**: monthly fixed costs such as rent, utilities, salaries.
- **Profit analysis**: include fixed costs for more realistic net profit.

### 6. Core business rules (highlights)

- **Access**: only SYSTEM_USER can log in; roles are fixed and not user-defined.
- **Pricing**:
  - purchase prices preserved historically (no overwrite),
  - higher new purchase price triggers admin alert,
  - selling prices set manually; no auto-markup.
- **Inventory**: updates from shop sales; focuses on current stock.
- **Shop sales**: automatically confirmed; no refunds/cancellations tracking.
- **Fuel sales**: derived from pump reading differences; pumpists don’t log each transaction.
- **Reconciliation**:
  - cash handed in compared to expected total,
  - discrepancies visible but no automatic salary penalties.
- **Reporting**: filterable by period, salesperson, product, category; profit includes fixed costs.
- **Security/scope**: no password reset, barcode scanning, payroll, integrations, or multilingual features.

### 7. Non-functional

- **Architecture**: PERN stack.
- **DB**: PostgreSQL.
- **Backend**: Express.js + TypeScript.
- **Frontend**: React + Vite + TypeScript.
- **Auth**: JWT.
- **API style**: REST.
- **Qualities**: reliability, predictability, maintainability, auditability, explicit validation.

### 8. Data & domain concepts

See `docs/DATABASE.md` and `docs/GLOSSARY.md` for the data model. Major entities:

- `User`, `Worker`, `Product`, `Category`, `PurchasePriceHistory`.
- `FuelType`, `Tank`, `FuelDelivery`; `Pump` (optional `tankId`), `PumpReading`, `Shift`, `ShiftWorker`.
- `ShopSale`, `ShopSaleItem` (Phase 2).
- `CashHandIn`, `ShiftReconciliationSummary`, `FixedCost`.

### 9. Workflows (condensed)

- **Product setup**: create categories → create products → set selling price → record purchase price → alert on price increase.
- **Shop sale (Phase 1)**: shift runs → owner/admin enters shift-end shop total → reconciliation uses that.
- **Shop sale (Phase 2)**: per-transaction sales → totals derived automatically.
- **Pump reading**: select pump & shift → enter opening and closing readings → system computes volume and revenue.
- **Cash hand-in & reconciliation**: worker hands in cash → admin records hand-in → system aggregates expected totals (shop + fuel) vs cash → discrepancy shown.
- **Monthly reporting**: select period → system aggregates sales, cash, discrepancies, fixed costs → compute profit.

### 10. Auditability

- Preserve history for:
  - purchase prices,
  - sales records,
  - pump readings,
  - reconciliation summaries.
- Avoid destructive updates that erase business history.

### 11. Implementation guidance

- Priorities: correctness, clear schema, predictable APIs, strong validation, testability, clean separation of frontend/backend.
- Safe order: docs → schema & migrations → seed → shared types/schemas → backend APIs → tests → frontend UI → reporting → hardening.
- Vertical slices: implement features end-to-end (schema → API → UI) instead of entire layers at once.

For full original prose, refer back to the initial product requirements document used to create this summary.
