## Glossary

Short definitions of key domain and technical terms used in PumpApp / PumpPro.

### Business / domain terms

- **Shift**: A contiguous operational period (e.g. 07:00–15:00) during which one or more workers are on duty. Reconciliation is done **per shift**.
- **ShiftWorker**: Junction between `Shift` and `Worker`, indicating which workers participated in a shift.
- **Daily report**: An aggregate view of all shifts for a calendar day. There is no separate “daily summary” table; it is computed from shift data.
- **Worker**: A person who works at the station but may not have system login (e.g. pumpist/fuel seller, shop seller without credentials).
- **User**: A login-enabled person (SYSTEM_USER) who can authenticate into PumpApp.
- **UserType**:
  - `SYSTEM_USER`: has login credentials.
  - `WORKER`: operational person only; may be referenced by shifts, cash hand-ins, etc.
- **Role**: Access level for SYSTEM_USER accounts. Fixed set: `ADMIN`, `USER`, `SALE`, `PUMPIST`.
- **Product**: An item sold in the shop (e.g. snacks, drinks, oil). Tracks selling price and current stock quantity. Product refers only to **shop** items; fuel is tracked separately via FuelType and Tank.
- **Category**: A grouping for products (e.g. “Beverages”, “Snacks”, “Fuel Additives”).
- **Pump**: A physical fuel pump; draws from one Tank (optional `tankId`). Multiple pumps may share a tank.
- **Pump reading / Pump index**: The numerical reading from a pump’s meter at a point in time. For PumpApp, readings are stored as `openingReading` and `closingReading` for a shift.
- **Fuel volume**: The estimated quantity of fuel sold during a shift, computed as `closingReading - openingReading`.
- **Fuel price**: Government-set unit price for fuel (e.g. per liter). Stored in `FuelPriceHistory` with an effective date range.
- **Fuel revenue**: Money value of fuel sold during a shift: `fuelRevenue = fuelVolume × pricePerUnit` (unless explicitly overridden).
- **FuelType**: A kind of fuel (e.g. Diesel, Petrol). Not a shop Product; used for tanks and pricing.
- **Tank**: Storage for one FuelType; has theoretical quantity (calculated) and optional actual quantity (dip/sensor); supplies one or more Pumps.
- **Fuel delivery**: Record of fuel received into a tank (quantity, date).
- **Theoretical quantity (tank)**: System-calculated tank level: previous quantity − fuel sold (from pump readings) + deliveries.
- **Actual quantity (tank)**: Physically measured tank level (dip or sensor); compared to theoretical to detect loss/theft/errors.
- **PurchasePriceHistory**: Historical record of purchase/acquisition prices for a product. New entries are appended; old prices are never overwritten. It answers questions like _“What was the profit on product X sold 3 months ago?”_ when the selling price or purchase price has changed since then: you look up the purchase price **effective at the time of the sale** to compute cost of goods and margin correctly.
- **Selling price**: The retail price at which a product is sold in the shop. Controlled manually by admins; **not** auto-derived from purchase price.
- **Inventory / stock**: Current quantity of a product on hand. In Phase 2, stock will update from transactional shop sales.
- **Shop sale**: A sale of shop products. In Phase 1, captured only as a **shift-end total**; in Phase 2, captured per transaction (`ShopSale` + `ShopSaleItem`).
- **ShopSalesSource**: Enum describing where the shop sales total used in reconciliation came from:
  - `SHIFT_SUMMARY_ENTRY` — total **derived from** the shift’s `ShiftProductStock` lines (`soldQty × sellingPrice`, summed).
  - `TRANSACTIONAL_SYSTEM_TOTAL` — derived from per-transaction sales data.
  - `MANUAL` — owner-entered total with a **reason** when the snapshot is not the source of truth for that shift.
- **Cash hand-in (CashHandIn)**: Cash handed in to the owner/admin for a shift. Stored as `amount` with **`shiftId`**, **`workerId` (required)** — which worker handed in how much — and `recordedById`. Optional **`varianceAmount` / `varianceNote`** record admin variance **on that same remittance** (signed amount: positive = short, negative = surplus). Recording is **ADMIN-only**. See [OPERATIONS.md](OPERATIONS.md).
- **Discrepancy**: For a shift, `(effectiveShopSalesTotal + fuelSalesTotal) - cashHandedTotal` (always **system-computed**). **Positive** ⇒ **short** (less cash than expected); **negative** ⇒ **over** (more cash than expected). See [OPERATIONS.md](OPERATIONS.md).
- **Physical shop book (field ops)**: **One** book for the shop, **one page per shift**, with per-product opening, purchases, sold, remaining, and shift totals. One **designated shop seller** is accountable for shop cash on that shift (manager does not substitute in that role). See [OPERATIONS.md](OPERATIONS.md).
- **Daily missing cash**: When the admin verifies the shift page and numbers **do not** add up, the gap is written as **missing cash for that day**—a **supervisory signal**, not necessarily the same as the app’s per-shift **discrepancy** field. See [OPERATIONS.md](OPERATIONS.md).
- **Weekly physical close / weekly enforced missing**: End-of-week **physical count on shelves with the seller**; the **missing or variance enforced** for accountability (e.g. payroll) is based on this check. It **may or may not** match the sum of **daily missings**; **weekly takes precedence** when they differ. Phase 1 may not persist this as its own record—see [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md#operational-vs-app-reconciliation-payroll).
- **Monthly payroll adjustment (shop)**: **Weekly-enforced** missings accumulate; amounts are typically **deducted from salary**; **rare positive** balance may result in **cash paid to the seller**. Labor law and policy are out of scope for the schema; the domain allows both **short** and **over** paths.
- **Fixed cost**: A recurring monthly business expense (rent, utilities, salaries, etc.) tracked for profit analysis.
- **Profit analysis**: Calculations of gross and net profit over a period, incorporating sales, cost of goods, and fixed costs.

### Technical terms

- **PERN stack**: PostgreSQL (database), Express.js (backend), React (frontend), Node.js (runtime).
- **Prisma**: Type-safe ORM used to access PostgreSQL from the backend.
- **JWT (JSON Web Token)**: Token format used for authentication; carries user id and role claims.
- **RBAC (Role-Based Access Control)**: Authorization strategy where permissions are determined by a user’s role.
- **Vertical slice**: A feature implemented end-to-end (schema → API → UI) rather than layer-by-layer.
