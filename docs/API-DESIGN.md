## API design

This document outlines the main REST resources and conventions for the PumpApp API.

### General conventions

- **Base URL** (dev): `http://localhost:4000/api` (exact port configured in `apps/api`).
- **Format**: JSON over HTTPS/HTTP.
- **Authentication**: JWT access token in `Authorization: Bearer <token>` header.
- **Versioning**: Single v1 API (`/api/*`) for now.

### Error format

Errors are returned in a consistent shape:

```json
{
  "error": "Human-readable message",
  "code": "OPTIONAL_MACHINE_CODE",
  "details": { "field": "validation context, if any" }
}
```

- Validation errors return **400 Bad Request**.
- Auth failures return **401 Unauthorized** or **403 Forbidden**.
- Not found returns **404 Not Found**.
- Unexpected errors return **500 Internal Server Error** with a generic message.

### Authentication

- `POST /api/auth/login`
  - Body: `{ "username": string, "password": string }`.
  - Response: `{ "token": string, "user": { id, name, role } }`.
  - Only `SYSTEM_USER` accounts can log in.

### Users & workers

- `GET /api/users` (ADMIN only) — list users.
- `POST /api/users` (ADMIN) — create user.
- `PATCH /api/users/:id` (ADMIN) — update user (role, active, etc.).

- `GET /api/workers` (ADMIN) — list workers.
- `POST /api/workers` (ADMIN) — create worker.
- `PATCH /api/workers/:id` (ADMIN) — update worker (role/designation, active, etc.).

### Products & categories

- `GET /api/categories`
- `POST /api/categories` (ADMIN)
- `PATCH /api/categories/:id` (ADMIN)

- `GET /api/products`
- `POST /api/products` (ADMIN)
- `PATCH /api/products/:id` (ADMIN)

Product list/detail responses may optionally include `category: { id, name }` so the UI can show category name without a separate lookup.

### Purchase price history

- `GET /api/products/:productId/purchase-prices`
- `POST /api/products/:productId/purchase-prices` (ADMIN)
  - Appends a new purchase price entry.
  - If price > previous, response includes an `alert` field so the UI can highlight it.

### Fuel price history

- `GET /api/fuel-prices` — list price records (filterable by pump, date range). Current API filters by pump; if fuel-type-based pricing is added later, a filter by `fuelTypeId` may be added.
- `POST /api/fuel-prices` (ADMIN) — create a new `FuelPriceHistory` row with `effectiveFrom` / `effectiveTo`.
- `PATCH /api/fuel-prices/:id` (ADMIN) — adjust or close a range if needed (non-destructive where possible).

### Fuel types

- `GET /api/fuel-types` — list fuel types.
- `POST /api/fuel-types` (ADMIN) — create fuel type.
- `PATCH /api/fuel-types/:id` (ADMIN) — update fuel type (name, active).

### Tanks

- `GET /api/tanks` — list tanks (optional query: `fuelTypeId`).
- `POST /api/tanks` (ADMIN) — create tank (fuelTypeId, name, capacity?, etc.).
- `PATCH /api/tanks/:id` (ADMIN) — update tank. Responses may include theoretical/actual quantity; optionally `GET /api/tanks/:id` for detail including quantity.

### Fuel deliveries

- `GET /api/tanks/:tankId/deliveries` — list deliveries for a tank (or `GET /api/fuel-deliveries?tankId=...`).
- `POST /api/tanks/:tankId/deliveries` (ADMIN) — record a delivery. Body: `{ "quantity": number, "deliveredAt": ISO date-time, "notes"?: string }`.

### Pumps

- `GET /api/pumps`
- `POST /api/pumps` (ADMIN) — body may include optional `tankId`.
- `PATCH /api/pumps/:id` (ADMIN) — may include optional `tankId`.

### Shifts & workers

- `GET /api/shifts` — list shifts (filter by date range, status).
- `POST /api/shifts` (ADMIN) — create shift (date, start/end times, status).
- `GET /api/shifts/:id` (ADMIN) — get one shift (includes optional shop accountable worker id).
- `PATCH /api/shifts/:id` (ADMIN) — update shift fields (status, times, notes, optional `shopAccountableWorkerId`).

- `GET /api/shifts/:id/workers` — list workers assigned to shift.
- `POST /api/shifts/:id/workers` (ADMIN) — assign workers to shift (ShiftWorker entries).
- `DELETE /api/shifts/:id/workers/:workerId` (ADMIN) — remove worker from shift.

### Shift stock snapshots (shop side)

- `GET /api/shifts/:id/stock` — get per-product stock snapshot for a shift.
  - Response: array of:
    - `productId`
    - `openingQty`
    - `receivedQty`
    - `closingQty`
    - optionally `soldQty` (derived)
    - product metadata as needed for the UI, e.g. `{ id, name, categoryId, categoryName? }`.
- `PUT /api/shifts/:id/stock` (ADMIN) — bulk upsert stock snapshot for a shift.
  - Body: array of:
    - `productId`
    - `openingQty?` (optional; defaults to previous shift’s `closingQty` for that product when omitted)
    - `closingQty` (required when the product was present and counted this shift)

Notes:

- The API must allow **partial updates**: clients can submit only the products that are relevant for that shift.
- When a shift transitions to `CLOSED`, the backend enforces:
  - **Fuel/pump coverage**: at least one assigned worker whose linked `User` has role **`PUMPIST`**, _or_ whose **designation** indicates pump work (e.g. contains “pump”, as in “Pumpist”).
  - **Shop coverage**: at least one assigned worker whose linked `User` has role **`SALE`**, _or_ whose **designation** indicates shop/counter work (e.g. “Shop”, “cashier”). This matches operations (designation) with optional login roles (RBAC).
  - At least one `PumpReading` exists for that shift (fuel side captured).
  - **Not required for close (current behavior):** a shop stock snapshot (`ShiftProductStock` rows). Reconciliation may still require stock or a `MANUAL` shop source.
  - For any `ShiftProductStock` rows that exist for the shift, `closingQty` should be valid when entered (see shift close implementation).
  - When the shift is successfully closed:
    - `soldQty = openingQty + receivedQty − closingQty` is computed per product.
    - `Product.currentStock` is decremented by `soldQty`.
- The stock snapshot for a shift is immutable once the shift is `RECONCILED`. Changes after reconciliation are admin-only and should require an audit note.

### Pump readings

- `GET /api/shifts/:id/pump-readings` — list pump readings for a shift. Each item includes `workerId` / `workerName` when set (the **shift pump assignee** at the time the reading was recorded; see `ShiftPumpAssignment`).
- `POST /api/shifts/:id/pump-readings` (ADMIN) — create readings for a pump and shift. Requires an existing assignment for that `pumpId` on the shift; the server stores `workerId` from that assignment.
- `PATCH /api/pump-readings/:id` (ADMIN) — correct opening/closing readings when necessary.

Backend computes `volume = closingReading - openingReading` and, together with fuel price for the shift date, derives revenue per pump.

### Cash hand-ins

- `GET /api/shifts/:id/cash-handins` — list cash hand-ins for a shift.
- `POST /api/shifts/:id/cash-handins` (**ADMIN**) — record cash hand-in.

Body (conceptually):

```json
{
  "workerId": 1,
  "amount": 1000.0,
  "varianceAmount": 50.0,
  "varianceNote": "Pump short"
}
```

- **`workerId` is required** — which worker handed in this amount (audit). Worker must be assigned to the shift. See [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md) and [OPERATIONS.md](OPERATIONS.md).
- **`varianceAmount` / `varianceNote` (optional)** — admin-recorded variance **for this hand-in event** (positive = missing / short; negative = surplus). Separate from the **system preview discrepancy** on the reconciliation summary. Omit or leave unset when there is no variance at remittance time.

- `PATCH /api/shifts/:id/cash-handins/:handInId` (ADMIN) — update variance fields only: body `{ varianceAmount?: number | null, varianceNote?: string | null }` (at least one key required). Use `null` to clear.

### Shift reconciliation summary

- `GET /api/shifts/:id/reconciliation` — get shift reconciliation summary (404 if none).
- `POST /api/shifts/:id/reconciliation` (**ADMIN**) — create summary for a shift.
- `PATCH /api/shifts/:id/reconciliation` (**ADMIN**) — update summary fields.

** Preconditions** (product rules):

- Shift must be **`CLOSED`** to create or update a reconciliation summary.
- On successful **create** or **update**, the API sets the shift status to **`RECONCILED`**.

**Fields** (conceptual; exact JSON names follow shared DTOs):

- `shopSalesSource` (`SHIFT_SUMMARY_ENTRY` | `TRANSACTIONAL_SYSTEM_TOTAL` | `MANUAL`),
- shop totals (`systemShopSalesTotal`, `manualShopSalesTotal`, `effectiveShopSalesTotal`, `manualShopSalesReason`),
- `fuelSalesTotal` — default from computed volume × price; **admin may override** with reason (see DOMAIN-DECISIONS),
- `cashHandedTotal` — default **sum of `CashHandIn`** for the shift; **admin may override** with audit note,
- `discrepancyAmount` — **read-only / server-computed** on write: `(effectiveShopSalesTotal + fuelSalesTotal) - cashHandedTotal` (clients must not be the source of truth for this value),
- `reviewedBy` and `notes` (also used for override explanations when dedicated columns are not present).

**UI**: treat **positive** discrepancy as **short** (less cash than expected) and **negative** as **over** (more cash than expected); see [OPERATIONS.md](OPERATIONS.md).

### Weekly inventory close (payroll authority)

- `GET /api/weekly-inventory-closes` (ADMIN) — list closes; optional query `from`, `to`, `workerId`.
- `POST /api/weekly-inventory-closes` (ADMIN) — create close (`weekStart`, `weekEnd`, `workerId`, `enforcedShortfall`, optional `lines` with `productId` / `physicalQty`).
- `GET /api/weekly-inventory-closes/:id` (ADMIN) — detail; response includes `sumDailyCashShortfalls` (sum of non-null `varianceAmount` on `CashHandIn` rows for that `workerId` on shifts whose date falls in the close’s week).
- `GET /api/weekly-inventory-closes/export.csv?month=YYYY-MM` (ADMIN) — CSV of closes overlapping that calendar month.

### Fixed costs

- `GET /api/fixed-costs` (ADMIN) — list fixed costs.
- `POST /api/fixed-costs` (ADMIN)
- `PATCH /api/fixed-costs/:id` (ADMIN)

### Reporting & profit

- `GET /api/reports/shifts` — shift-level summaries, filter by date range, worker, role.
- `GET /api/reports/days` — daily summaries (aggregated from shifts), filter by date range.
- `GET /api/reports/discrepancies` — list discrepancies by shift/day, filter by worker and period.
- `GET /api/reports/fuel` — fuel volume and revenue summaries.
- `GET /api/reports/inventory` — product stock views (Phase 2).
- `GET /api/reports/profit` — profit analysis for a period, including fixed costs.

These reporting endpoints will likely accept query parameters like `from`, `to`, `shiftId`, `workerId`, `productId`, `categoryId`.
