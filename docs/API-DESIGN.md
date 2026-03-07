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

### Purchase price history

- `GET /api/products/:productId/purchase-prices`
- `POST /api/products/:productId/purchase-prices` (ADMIN)
  - Appends a new purchase price entry.
  - If price > previous, response includes an `alert` field so the UI can highlight it.

### Fuel price history

- `GET /api/fuel-prices` — list price records (filterable by pump or product, date range).
- `POST /api/fuel-prices` (ADMIN) — create a new `FuelPriceHistory` row with `effectiveFrom` / `effectiveTo`.
- `PATCH /api/fuel-prices/:id` (ADMIN) — adjust or close a range if needed (non-destructive where possible).

### Pumps

- `GET /api/pumps`
- `POST /api/pumps` (ADMIN)
- `PATCH /api/pumps/:id` (ADMIN)

### Shifts & workers

- `GET /api/shifts` — list shifts (filter by date range, status).
- `POST /api/shifts` (ADMIN) — create shift (date, start/end times, status).
- `PATCH /api/shifts/:id` (ADMIN) — update shift fields (status, times, notes).

- `GET /api/shifts/:id/workers` — list workers assigned to shift.
- `POST /api/shifts/:id/workers` (ADMIN) — assign workers to shift (ShiftWorker entries).
- `DELETE /api/shifts/:id/workers/:workerId` (ADMIN) — remove worker from shift.

### Pump readings

- `GET /api/shifts/:id/pump-readings` — list pump readings for a shift.
- `POST /api/shifts/:id/pump-readings` (ADMIN) — create readings for a pump and shift.
- `PATCH /api/pump-readings/:id` (ADMIN) — correct readings when necessary.

Backend computes `volume = closingReading - openingReading` and, together with fuel price for the shift date, derives revenue per pump.

### Cash hand-ins

- `GET /api/shifts/:id/cash-handins` — list cash hand-ins for a shift.
- `POST /api/shifts/:id/cash-handins` (ADMIN) — record cash hand-in.

Body (conceptually):

```json
{
  "workerId": "optional worker reference",
  "amount": 1000.0
}
```

### Shift reconciliation summary

- `GET /api/shifts/:id/reconciliation` — get shift reconciliation summary.
- `POST /api/shifts/:id/reconciliation` (ADMIN) — create summary for a shift.
- `PATCH /api/shifts/:id/reconciliation` (ADMIN) — update summary fields.

Fields include:

- `shopSalesSource` (SHIFT_SUMMARY_ENTRY | TRANSACTIONAL_SYSTEM_TOTAL | MANUAL),
- shop totals (`systemShopSalesTotal`, `manualShopSalesTotal`, `effectiveShopSalesTotal`, `manualShopSalesReason`),
- `fuelSalesTotal` (computed from volume + price, or overridden),
- `cashHandedTotal` (sum of `CashHandIn` or overridden),
- `discrepancyAmount` (derived),
- `reviewedBy` and `notes`.

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
