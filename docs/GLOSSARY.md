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
- **Product**: An item sold in the shop (e.g. snacks, drinks, oil). Tracks selling price and current stock quantity.
- **Category**: A grouping for products (e.g. “Beverages”, “Snacks”, “Fuel Additives”).
- **Pump**: A physical fuel pump at the station (may later be linked to specific fuel products).
- **Pump reading / Pump index**: The numerical reading from a pump’s meter at a point in time. For PumpApp, readings are stored as `openingReading` and `closingReading` for a shift.
- **Fuel volume**: The estimated quantity of fuel sold during a shift, computed as `closingReading - openingReading`.
- **Fuel price**: Government-set unit price for fuel (e.g. per liter). Stored in `FuelPriceHistory` with an effective date range.
- **Fuel revenue**: Money value of fuel sold during a shift: `fuelRevenue = fuelVolume × pricePerUnit` (unless explicitly overridden).
- **PurchasePriceHistory**: Historical record of purchase/acquisition prices for a product. New entries are appended; old prices are never overwritten.
- **Selling price**: The retail price at which a product is sold in the shop. Controlled manually by admins; **not** auto-derived from purchase price.
- **Inventory / stock**: Current quantity of a product on hand. In Phase 2, stock will update from transactional shop sales.
- **Shop sale**: A sale of shop products. In Phase 1, captured only as a **shift-end total**; in Phase 2, captured per transaction (`ShopSale` + `ShopSaleItem`).
- **ShopSalesSource**: Enum describing where the shop sales total used in reconciliation came from:
  - `SHIFT_SUMMARY_ENTRY` — admin-entered shift-end total.
  - `TRANSACTIONAL_SYSTEM_TOTAL` — derived from per-transaction sales data.
  - `MANUAL` — exceptional manual total with a note.
- **Cash hand-in (CashHandIn)**: The act of a worker or user handing in cash to the owner/admin for a shift. Stored as `amount` linked to `shiftId` and optionally `workerId`.
- **Discrepancy**: The difference between **expected money** (shop + fuel totals) and **actual cash handed in** for a shift.
- **Fixed cost**: A recurring monthly business expense (rent, utilities, salaries, etc.) tracked for profit analysis.
- **Profit analysis**: Calculations of gross and net profit over a period, incorporating sales, cost of goods, and fixed costs.

### Technical terms

- **PERN stack**: PostgreSQL (database), Express.js (backend), React (frontend), Node.js (runtime).
- **Prisma**: Type-safe ORM used to access PostgreSQL from the backend.
- **JWT (JSON Web Token)**: Token format used for authentication; carries user id and role claims.
- **RBAC (Role-Based Access Control)**: Authorization strategy where permissions are determined by a user’s role.
- **Vertical slice**: A feature implemented end-to-end (schema → API → UI) rather than layer-by-layer.
