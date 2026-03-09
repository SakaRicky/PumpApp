## PumpApp / PumpPro

PumpApp (product name **PumpPro**) is a PERN-stack (PostgreSQL, Express, React, Node.js) web application for managing a petrol station and its convenience store.

It focuses on:

- **Shift-based operations and reconciliation**
- **Fuel pump readings and fuel revenue estimation**
- **Shop sales (initially shift-end totals, later per-transaction)**
- **Inventory tracking for shop products**
- **Cash hand-in and discrepancy tracking**
- **Fixed cost capture and profit analysis**

### Monorepo layout

```text
PumpApp/
├── apps/
│   ├── web/          # React + Vite + TypeScript, shadcn/ui, TanStack Table, RHF, Zod
│   └── api/          # Express + TypeScript + Prisma
├── packages/
│   └── shared/       # Shared types, enums, Zod validation schemas
├── db/               # Prisma schema, migrations, seed
├── docs/             # Product and technical documentation
├── package.json      # Root package + scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Stack

- **Database**: PostgreSQL + Prisma ORM
- **Backend**: Express.js + TypeScript, JWT auth, role-based access
- **Frontend**: React + Vite + TypeScript, shadcn/ui, TanStack Table, React Hook Form, Zod
- **Tooling**: pnpm workspaces, ESLint, Prettier, shared `tsconfig.base.json`

### Core domain concepts

See:

- `docs/REQUIREMENTS.md` – full product requirements
- `docs/DOMAIN-DECISIONS.md` – finalized domain decisions (shift model, fuel price, shop sales source, phased capture)
- `docs/DATABASE.md` – schema overview
- `docs/API-DESIGN.md` – REST resources and contracts
- `docs/FUEL-TRACKING.md` – fuel tracking (tanks, deliveries, theoretical vs actual quantity)

### Getting started (development)

#### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL instance (local or remote)

Create a `.env` file at the repo root:

```bash
cp .env.example .env   # once .env.example exists
```

Example `DATABASE_URL` (local Postgres):

```bash
DATABASE_URL="postgres://postgres:password@localhost:5432/pumpapp"
JWT_SECRET="change-me"
```

#### Install dependencies

```bash
cd /Users/rickysaka/Documents/PumpApp
pnpm install
```

#### Database: migrate & seed

```bash
# Run initial migrations (after prisma schema exists)
pnpm db:migrate

# Optional: seed development data
pnpm db:seed
```

#### Run backend API

```bash
pnpm dev:api
```

The API will run on the port configured in `apps/api` (typically `http://localhost:4000`).

#### Run frontend web app

```bash
pnpm dev:web
```

The web app will run on the Vite dev server (typically `http://localhost:5173`).

### Run CI locally

To check that the same steps as GitHub Actions will pass before you push:

```bash
pnpm ci:local
```

This runs: `install --frozen-lockfile`, `db:generate`, `lint`, and `build`. It does not run migrations (that step in CI uses a dedicated Postgres service). To run migrations too, use a CI-style database and run:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pumpapp_ci" pnpm db:migrate:deploy
```

For full workflow parity (including the same Node/Postgres environment), you can use [act](https://github.com/nektos/act) (requires Docker): `act push` or `act -j ci`.

### Documentation

- `docs/DEPLOYMENT.md`: deploy with Supabase, GitHub Secrets, migrations, seed, and single build.
- `docs/REQUIREMENTS.md`: product requirements (PumpPro spec)
- `docs/GLOSSARY.md`: domain terms (Shift, PumpReading, CashHandIn, etc.)
- `docs/ARCHITECTURE.md`: monorepo architecture and data flow
- `docs/API-DESIGN.md`: REST resources, URLs, and error model
- `docs/DATABASE.md`: entities, relationships, indexes
- `docs/IMPLEMENTATION-ORDER.md`: step-by-step build order
- `docs/DOMAIN-DECISIONS.md`: resolved domain decisions
- `docs/FUEL-TRACKING.md`: fuel tracking (tanks, deliveries, theoretical vs actual)

### Status

This repository is being built incrementally following the implementation order in `docs/IMPLEMENTATION-ORDER.md`.
