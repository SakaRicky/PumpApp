## Shift Stock Entry UI (Phase 1)

### Goals

- Replace the manual Excel sheet used at shift change.
- Make it fast and reliable to enter closing counts for many products.
- Prepare for Phase 2, where transactional sales pre-fill expectations and expose loss/shrinkage.
- Align with the **physical shop book** model: **one book for the shop, one page per shift** (see [OPERATIONS.md](OPERATIONS.md)). The UI is a **digital shift page**; **purchases** recorded in the paper book (even when a product had no sales) are **not** yet modeled as separate rows in Phase 1—see [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md#operational-vs-app-reconciliation-payroll).

### Location in the app

- Screen: `Shift detail → "Shop stock" tab`.
- Accessible only to **admins** in Phase 1.

### Data shown

- For the selected shift:
  - `date`, `startTime`, `endTime`, `status`.
  - Assigned workers with roles (`SALE`, `PUMPIST`).
- For each relevant product row:
  - Product: name (+ optional code).
  - Category: name.
  - Opening quantity:
    - Default: previous shift’s `closingQty` for that product (or `Product.currentStock` for the first shift).
    - Typically **read-only** with an “override” control if the start-of-shift count differs.
  - Closing quantity:
    - Editable numeric field.
  - Sold quantity:
    - Derived live as `openingQty + receivedQty − closingQty` (`receivedQty` = purchases/deliveries during the shift).
  - Line revenue:
    - Derived live as `soldQty × sellingPrice`.

### Table behavior

- Single table with inline editing (no per-row modals).
- Columns: `Product | Category | Opening | Closing | Sold | Revenue`.
- Keyboard-friendly:
  - Tab / Shift+Tab to move horizontally.
  - Enter / Arrow keys to move vertically.
  - Focus should stay inside the table until the user explicitly leaves.

### Filtering and scoping

- Default filters:
  - Only **active** products.
- Additional filters:
  - By **category**.
  - By **product search** (name or code).
  - Toggle: **“Only products with changes”** to review what was edited.
- Optional per-row control:
  - “Not on shelf this shift”:
    - Excludes this product from the shift stock snapshot without affecting global inventory.

### Bulk actions (optional, nice-to-have)

- Per category:
  - “Copy previous closing as this closing”:
    - For shelves that did not move, use last shift’s closing as the new closing.
    - User then only edits the few products that changed.
- Global:
  - “Mark all unchanged”:
    - For very slow-moving sections; behaves similarly to copying previous closing for all rows.

### Validation rules (frontend hints)

- `closingQty` must be a non-negative number.
- If `closingQty > openingQty`, flag the row as a **warning**:
  - UI should show a clear highlight and explanation (restock, counting error, or data issue).
- If `soldQty` is extremely large relative to typical volume (future enhancement when you have history), highlight as a potential anomaly.

### Interaction with shift status and closure

- When `Shift.status ∈ { PLANNED, OPEN }`:
  - Table is editable.
  - Admin can add/update `ShiftProductStock` rows for that shift.
- When attempting to transition a shift to `CLOSED`:
  - Backend requires **shop-side** and **fuel-side** coverage among assigned workers: login roles **SALE** / **PUMPIST**, and/or **designations** such as Shop / Pumpist (see API closure rules).
  - At least one `PumpReading` must exist for that shift (see S4).
  - **For now**, a `ShiftProductStock` snapshot is **not** required to close; when rows exist, `closingQty` should still be valid. Reconciliation may still require stock or a manual shop total.
- When `Shift.status = CLOSED`:
  - Table becomes read-only except for admin corrections.
- When `Shift.status = RECONCILED`:
  - Table is read-only by default.
  - Any corrections must be:
    - Admin-only.
    - Paired with an audit note (reason).

### Summary panel

- Above or below the table, show a summary for the shift:
  - Total shop revenue derived from this snapshot.
  - Number of products with edited counts.
  - Count of rows with warnings (e.g. negative/large `soldQty`, `closingQty > openingQty`).
  - A clear indication when the snapshot is **complete enough** for closing the shift (e.g. “All required shop stock data entered”).

### Phase 2 evolution (transactional sales)

- When `ShopSale` / `ShopSaleItem` are in use:
  - Table gains additional “expected” columns:
    - `expectedSoldQty` from transactional data.
    - `expectedClosingQty = openingQty − expectedSoldQty ± adjustments`.
  - Loss/shrinkage can be shown per row:
    - `loss = (openingQty − closingQty) − expectedSoldQty`.
- The core UX remains the same; this screen becomes a **verification and discrepancy review** instead of purely manual entry.
