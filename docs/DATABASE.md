## Database design

PumpApp uses PostgreSQL with Prisma as the ORM. This document summarizes the schema at a conceptual level.

### Entities

#### User

- `id` (PK)
- `name`
- `email` / `username` (unique)
- `passwordHash`
- `role` (enum `Role`: ADMIN, USER, SALE, PUMPIST)
- `userType` (enum `UserType`: SYSTEM_USER)
- `active` (boolean)
- timestamps

Only `User` with `userType = SYSTEM_USER` can log in.

#### Worker

- `id` (PK)
- `name`
- `designation` / `roleLabel` (text)
- `active` (boolean)
- timestamps

Represents operational staff who may not have system accounts.

#### Category

- `id` (PK)
- `name`
- `description`

#### Product

- `id` (PK)
- `name`
- `categoryId` → `Category`
- `sellingPrice` (decimal)
- `currentStock` (decimal)
- `active` (boolean)
- timestamps

#### PurchasePriceHistory

- `id` (PK)
- `productId` → `Product`
- `purchasePrice` (decimal)
- `effectiveAt` (timestamp)
- `notes`

Append-only history of purchase prices.

#### Pump

- `id` (PK)
- `name` / `code`
- `active` (boolean)

#### FuelPriceHistory

- `id` (PK)
- `pumpId` or `fuelProductId` (FK)
- `pricePerUnit` (decimal)
- `effectiveFrom` (date)
- `effectiveTo` (date or nullable for open-ended)

Used to look up fuel price by shift date.

#### Shift

- `id` (PK)
- `date` (date)
- `startTime` (time)
- `endTime` (time)
- `status` (enum `ShiftStatus`, e.g. OPEN, CLOSED, RECONCILED)
- optional notes

#### ShiftWorker

- `shiftId` → `Shift`
- `workerId` → `Worker`
- (composite primary key on `shiftId`, `workerId`)

#### PumpReading

- `id` (PK)
- `pumpId` → `Pump`
- `shiftId` → `Shift`
- `openingReading` (decimal)
- `closingReading` (decimal)
- `recordedById` → `User`
- `recordedAt` (timestamp)

Volume is derived as `closingReading - openingReading`.

#### CashHandIn

- `id` (PK)
- `shiftId` → `Shift`
- `workerId` → `Worker` (nullable)
- `amount` (decimal)
- `recordedById` → `User`
- `recordedAt` (timestamp)

Represents cash physically handed in for a shift.

#### ShiftReconciliationSummary

- `id` (PK)
- `shiftId` → `Shift` (unique; 1:1)
- `shopSalesSource` (enum `ShopSalesSource`: SHIFT_SUMMARY_ENTRY, TRANSACTIONAL_SYSTEM_TOTAL, MANUAL)
- `systemShopSalesTotal` (decimal, nullable)
- `manualShopSalesTotal` (decimal, nullable)
- `effectiveShopSalesTotal` (decimal)
- `manualShopSalesReason` (text, nullable)
- `fuelSalesTotal` (decimal) — computed from pump readings + fuel prices, or overridden
- `cashHandedTotal` (decimal)
- `discrepancyAmount` (decimal) — derived as `(effectiveShopSalesTotal + fuelSalesTotal) - cashHandedTotal`
- `reviewedById` → `User` (nullable)
- `notes` (text, nullable)
- timestamps

#### ShopSale (Phase 2)

- `id` (PK)
- `createdAt` (timestamp)
- `totalAmount` (decimal)
- `createdById` → `User` (nullable seller reference)
- `shiftId` → `Shift` (optional but recommended)

#### ShopSaleItem (Phase 2)

- `id` (PK)
- `shopSaleId` → `ShopSale`
- `productId` → `Product`
- `quantity` (decimal)
- `unitPriceAtSale` (decimal)
- `lineTotal` (decimal)

Stock decrements per `ShopSaleItem` when Phase 2 is active.

#### FixedCost

- `id` (PK)
- `name` / `category`
- `monthlyAmount` (decimal)
- `effectiveMonth` (date or year-month)
- `notes`

### Enums

- `UserType`: `SYSTEM_USER` (future-safe for more types).
- `Role`: `ADMIN`, `USER`, `SALE`, `PUMPIST`.
- `ShiftStatus`: e.g. `PLANNED`, `OPEN`, `CLOSED`, `RECONCILED` (exact set to be defined in Prisma schema).
- `ShopSalesSource`: `SHIFT_SUMMARY_ENTRY`, `TRANSACTIONAL_SYSTEM_TOTAL`, `MANUAL`.

### Indexing

Recommended indexes:

- `Product.categoryId`
- `PurchasePriceHistory.productId`, `effectiveAt`
- `FuelPriceHistory.pumpId` / `fuelProductId`, `effectiveFrom`, `effectiveTo`
- `Shift.date`, `Shift.status`
- `ShiftWorker.shiftId`, `ShiftWorker.workerId`
- `PumpReading.shiftId`, `PumpReading.pumpId`
- `CashHandIn.shiftId`, `CashHandIn.workerId`
- `ShiftReconciliationSummary.shiftId`

### Prisma

The concrete Prisma schema lives in `db/schema.prisma` and should mirror this conceptual model.
