## Implementation order

This document mirrors the high-level plan and turns it into a checklist.

### 1. Documentation

- [ ] Create `README.md` at the repo root.
- [ ] Add `docs/REQUIREMENTS.md` (PumpPro product requirements).
- [ ] Add `docs/GLOSSARY.md`.
- [ ] Add `docs/ARCHITECTURE.md`.
- [ ] Add `docs/API-DESIGN.md`.
- [ ] Add `docs/DATABASE.md`.
- [ ] Add `docs/DOMAIN-DECISIONS.md` (this file is already created).
- [ ] Add `docs/OPERATIONS.md` (real-world cadence: daily reconciliation, weekly shop counts).
- [ ] Add `docs/IMPLEMENTATION-ORDER.md` (this file).
- [ ] Create/update `docs/FUEL-TRACKING.md` and align DOMAIN-DECISIONS and DATABASE with the fuel-tracking model (FuelType, Tank, deliveries, theoretical vs actual).

### 2. Monorepo scaffolding

- [ ] Create `package.json` in the repo root with pnpm workspaces, Prisma, and TypeScript.
- [ ] Create `pnpm-workspace.yaml` listing `apps/*` and `packages/*`.
- [ ] Create `tsconfig.base.json` with shared compiler options.
- [ ] Create base folders: `apps/web`, `apps/api`, `packages/shared`, `db`.

### 3. Database layer (`db/`)

- [ ] Add `db/schema.prisma` that includes:
  - `User`, `Worker`, `Category`, `Product`, `PurchasePriceHistory`, `Pump`.
  - `FuelType`, `Tank`, `FuelDelivery`; `Pump.tankId` (optional).
  - `Shift`, `ShiftWorker`, `FuelPriceHistory`, `PumpReading`.
  - `ShiftReconciliationSummary` with shop sales source fields.
  - `ShopSale`, `ShopSaleItem` (Phase 2), `CashHandIn`, `FixedCost`.
  - Enums: `UserType`, `Role`, `ShiftStatus`, `ShopSalesSource`.
- [ ] Configure datasource for PostgreSQL and generator for Prisma Client.
- [ ] Run initial migration.
- [ ] Add `db/seed.ts` with minimal seed data (admin user, sample products, pumps, workers).

### 4. Shared package (`packages/shared`)

- [ ] Create `packages/shared/package.json` and `tsconfig.json`.
- [ ] Add enums mirrored from Prisma (`Role`, `UserType`, `ShiftStatus`, `ShopSalesSource`).
- [ ] Add DTO types for key API requests/responses.
- [ ] Add Zod schemas for:
  - auth (login),
  - products & categories,
  - shifts & ShiftWorker,
  - fuel price history,
  - pump readings,
  - cash hand-in,
  - shift reconciliation summary,
  - fixed costs.
- [ ] Export everything from `packages/shared/src/index.ts`.

### 5. API application (`apps/api`)

- [ ] Scaffold `apps/api` with TypeScript, Express, and Prisma Client.
- [ ] Add `tsconfig.json` extending `tsconfig.base.json`.
- [ ] Implement app bootstrap (`src/app.ts`, `src/server.ts`).
- [ ] Implement middleware:
  - error handler,
  - JWT auth (access token) and role-based guard,
  - request validation using Zod schemas from `packages/shared`.
- [ ] Implement core modules (Phase 1):
  - auth (login),
  - users, workers,
  - categories, products,
  - purchase price history (append-only, alerts on increase),
  - fuel price history,
  - pumps,
  - shifts + ShiftWorker,
  - pump readings (volume = closing − opening),
  - cash hand-in,
  - shift reconciliation summary (shop totals, fuel totals, cash, discrepancy),
  - fixed costs,
  - reporting (by shift/day, with filters) and profit analysis (including fixed costs).

### 6. Web application (`apps/web`)

- [ ] Scaffold `apps/web` with Vite + React + TypeScript.
- [ ] Add Tailwind + shadcn/ui, React Router, TanStack Table, React Hook Form, Zod.
- [ ] Add `tsconfig.json` extending `tsconfig.base.json` and Vite config with `@` alias.
- [ ] Implement auth flow:
  - login page,
  - auth context,
  - route protection.
- [ ] Implement layout (nav, shell) with role-based menu visibility.
- [ ] Implement Phase 1 feature UIs:
  - manage products & categories,
  - manage workers & pumps,
  - manage fuel price history,
  - manage shifts & assign workers,
  - enter pump readings,
  - record cash hand-in,
  - enter/edit shift reconciliation summaries,
  - view basic reports and profit summaries.

### 7. Reporting & profit analysis

- [ ] Expose reporting endpoints for:
  - shift-level summaries,
  - day-level summaries (aggregated from shifts),
  - discrepancy reports,
  - fuel sold summaries,
  - inventory / product views,
  - profit including fixed costs.
- [ ] Add UI screens using TanStack Table for the above reports.

### 7b. Fuel tank and delivery tracking

- [ ] Schema and migrations: FuelType, Tank, FuelDelivery, Pump.tankId (already in schema).
- [ ] Shared: DTOs and Zod schemas for fuel types, tanks, fuel deliveries.
- [ ] API: fuel types CRUD; tanks CRUD; tank deliveries (list, create); optional endpoint or field for theoretical/actual quantity.
- [ ] UI: manage fuel types and tanks; record deliveries; optional view for theoretical vs actual quantity.
- [ ] Tests: tank quantity formula; delivery recording and effect on theoretical quantity.

### 8. Phase 2 — transactional shop sales (later)

- [ ] Implement `ShopSale` and `ShopSaleItem` APIs and wiring to inventory.
- [ ] Implement shop sales entry UI (per-transaction recording).
- [ ] Update reconciliation to optionally use `TRANSACTIONAL_SYSTEM_TOTAL` when available.

### 9. Hardening

- [ ] Add linting configs and run across apps/packages.
- [ ] Add basic test coverage for critical flows:
  - login,
  - shift creation and reconciliation math,
  - pump readings + fuel revenue computation.
- [ ] Review validation and error messages for clarity.
