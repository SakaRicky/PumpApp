## Domain decisions

These decisions are **finalized** for PumpApp / PumpPro. Agents and developers must treat them as fixed unless this document is updated.

### Shift model

- **Shift** is the main operational unit.
- One shift can have **many workers** via a junction table `ShiftWorker` (`shiftId`, `workerId`).
- There is exactly **one** `ShiftReconciliationSummary` per shift (1:1 with `Shift`).
- **Daily reports** are aggregations of shift data for a calendar day – there is no separate per-day summary table.
- `CashHandIn` and `PumpReading` records **belong to a shift**; each `CashHandIn` **must** reference the `Worker` who handed in that amount (audit and accountability). See [OPERATIONS.md](OPERATIONS.md) for daily cash vs weekly shop counts.

### Fuel sales money

- Fuel **volume** is derived from pump readings: `volume = closingReading - openingReading`.
- Fuel **revenue** is **formula-first**:
  - `fuelRevenue = volume × pricePerUnit`.
- Fuel prices are stored in `FuelPriceHistory` with an **effective date range**:
  - fields: `id`, `pumpId` or `fuelProductId`, `pricePerUnit`, `effectiveFrom`, `effectiveTo`.
  - prices are typically government-set and may remain unchanged for long periods (months/years).
- For a given shift, the system finds the **unique** `FuelPriceHistory` row whose `[effectiveFrom, effectiveTo]` range contains the shift’s date and uses that price to compute revenue.
- Default behavior: revenue is **computed** from volume and price.
- Admins may **override** computed fuel revenue for a shift, but overrides:
  - must be explicitly stored,
  - must carry a note / reason,
  - must be clearly identifiable in audit and reporting.
- Tank quantity is tracked per tank (theoretical and optional actual) for loss detection; see [FUEL-TRACKING.md](FUEL-TRACKING.md).

### Fuel as a separate domain

- Fuel is **not** modeled as a shop Product or ShopSaleItem. Fuel types (e.g. Diesel, Petrol) are represented by the **FuelType** entity; tanks belong to a fuel type; pumps draw from tanks; deliveries and tank quantity (theoretical vs actual) are part of this fuel subdomain.
- For full rationale, formulas, and tank/reconciliation relationship, see [FUEL-TRACKING.md](FUEL-TRACKING.md).

### Shop sales source

Shop sales totals used for reconciliation can come from multiple sources, but the summary must always know **which** source was used.

- `shopSalesSource` is an enum with values:
  - `SHIFT_SUMMARY_ENTRY` — shop total **derived from** the shift’s `ShiftProductStock` snapshot (`soldQty × sellingPrice` per line, summed), when that snapshot is the source of truth for the reconciliation line.
  - `TRANSACTIONAL_SYSTEM_TOTAL` — sum of recorded `ShopSale` / `ShopSaleItem` transactions.
  - `MANUAL` — owner-entered total when the snapshot is not used or does not reflect reality for that shift (e.g. weekly physical count not aligned to this shift); **should** include `manualShopSalesReason`.
- Phase 1 **supports both** `SHIFT_SUMMARY_ENTRY` and `MANUAL` so daily reconciliation can proceed even when physical shop counts follow a **weekly** cadence off-system; see [OPERATIONS.md](OPERATIONS.md).
- The reconciliation summary stores:
  - `shopSalesSource`,
  - `systemShopSalesTotal` (when `TRANSACTIONAL_SYSTEM_TOTAL`),
  - `manualShopSalesTotal` (when `MANUAL` or special fallback),
  - `effectiveShopSalesTotal` — the actual value used for discrepancy calculation,
  - `manualShopSalesReason` — optional but recommended explanation when source is `MANUAL`.
- Reports must be able to distinguish system-derived vs manual totals.

### Phased shop sales capture

PumpApp is **reconciliation-first**, not POS-first. It supports a phased adoption path for shop sales capture.

#### Phase 1 — Shift-end summary only (initial mode)

- Shop sales **are not recorded per transaction** during the shift.
- At the **end of each shift**, the owner/admin uses the system as a **digital replacement for the existing paper/Excel sheet** by entering per-product stock counts (opening and closing) for that shift.
- Reconciliation for a shift is based on:
  - shop total from **`SHIFT_SUMMARY_ENTRY`** (derived from `ShiftProductStock` when used) or **`MANUAL`** (owner-entered with reason when needed),
  - fuel revenue from pump readings and fuel price from `FuelPriceHistory` (overridable by admin with reason),
  - cash total defaulting to **sum of `CashHandIn`** (overridable by admin with audit note),
  - **server-computed** discrepancy.
- This reflects the real-world constraint that the owner **does not fully trust counter staff** yet and prefers to control data entry at shift end.

#### Phase 2 — Transactional sales (future enhancement)

- The system later adds support for **per-transaction shop sales**:
  - `ShopSale` (header) and `ShopSaleItem` (lines).
  - Automatic stock decrement per `ShopSaleItem`.
- When transactional sales exist for a shift, reconciliation can use:
  - `shopSalesSource = TRANSACTIONAL_SYSTEM_TOTAL` and
  - `systemShopSalesTotal = sum(ShopSaleItem.lineTotal)` for that shift.
- Shift-end manual totals remain supported as a fallback, but transactional data becomes the preferred source.

#### Schema implications

- The database schema must support **both** Phase 1 and Phase 2 from day one:
  - include `ShopSale` / `ShopSaleItem` models even if unused initially,
  - include `ShopSalesSource` enum and the shop total fields on `ShiftReconciliationSummary`.
- Phase 1 uses `SHIFT_SUMMARY_ENTRY` (and `MANUAL` when needed), with no requirement to create `ShopSale` rows.
- Phase 2 adds transactional capture and inventory coupling **without breaking** existing data.

### Cash hand-in and shift reconciliation (Phase 1)

- **Who records cash hand-ins**: **`ADMIN` only** (API and UI).
- **Worker on each hand-in**: **`workerId` is required** on every `CashHandIn` (which worker handed in how much).
- **When reconciliation exists**: Create or update `ShiftReconciliationSummary` only when the shift status is **`CLOSED`** (not `OPEN` / `PLANNED`).
- **Shift status after reconciliation**: When a reconciliation summary is **successfully created or updated**, the shift **automatically** transitions to **`RECONCILED`**.
- **Cash total on the summary**: Default **`cashHandedTotal`** = **sum** of all `CashHandIn.amount` for that shift. Admins may **override** the stored total (e.g. known physical count vs recorded hand-ins); overrides **must** carry an audit trail—at minimum **`notes`** or a dedicated reason/source field so reports can distinguish **sum-of-hand-ins** vs **override**.
- **Fuel total on the summary**: Default from **computed** fuel revenue (pump readings × applicable `FuelPriceHistory`). Admins may **override** `fuelSalesTotal` with a **note / reason**, consistent with [Fuel sales money](#fuel-sales-money).
- **Discrepancy**: Always **server-derived**, never client-supplied:
  - `discrepancyAmount = (effectiveShopSalesTotal + fuelSalesTotal) - cashHandedTotal`
  - **Positive** discrepancy ⇒ cash handed in **less** than expected (**short**).
  - **Negative** discrepancy ⇒ cash handed in **more** than expected (**over**).
- **One summary per shift**: At most one `ShiftReconciliationSummary` row per `shiftId` (1:1).

### Summary

- Reconciliation is **per shift**, not per abstract day.
- Fuel revenue is **derived** from pump readings and a date-range fuel price table, with explicit override support.
- Fuel is a **separate domain** from shop products (FuelType, Tank, deliveries, theoretical vs actual quantity); see [FUEL-TRACKING.md](FUEL-TRACKING.md).
- Shop totals always have an explicit **source** and optional explanation.
- The system starts as an **owner-driven, shift-end reconciliation tool** and later grows into a richer transactional system, without schema churn.
- **Operational cadence** (daily cash collection vs weekly shop counts) is described in [OPERATIONS.md](OPERATIONS.md).
