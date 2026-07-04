# Deploy PumpApp on Railway

This app deploys to Railway as one service: the Vite frontend is built into the
Express API, and the API serves both `/api/*` and the static web app.

## 1. Create the Railway project

1. Push this repository to GitHub.
2. In Railway, create a new project from the GitHub repo.
3. Add a Railway PostgreSQL database to the same project.
4. Open the app service variables and add the values below.

## 2. Environment variables

Required:

```text
DATABASE_URL=<Railway Postgres DATABASE_URL>
JWT_SECRET=<long random secret>
```

Recommended for the first admin user:

```text
SEED_ADMIN_EMAIL=owner@example.com
SEED_ADMIN_PASSWORD=<strong password>
SEED_ADMIN_NAME=Station Admin
```

Optional:

```text
SEED_DEMO_SHIFT=true
```

Leave `SEED_DEMO_SHIFT` unset for a real production station. Set it only when
you want one sample planned shift for testing.

Do not set `VITE_API_URL` for the normal Railway single-service deployment. The
frontend will call the same origin under `/api`.

## 3. Railway build and start commands

Set these in the Railway service settings:

```text
Build Command: pnpm railway:build
Start Command: pnpm railway:start
```

What they do:

- `pnpm railway:build` builds the shared package, builds the frontend, copies the
  frontend files into `apps/api/public`, and builds the API.
- `pnpm railway:start` applies Prisma migrations, runs the idempotent seed, then
  starts the compiled API.

## 4. First deploy

After Railway finishes the first deployment:

1. Open the generated Railway URL.
2. Log in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
3. Confirm master data exists:
   - Workers
   - Products and categories
   - Fuel types, tanks, pumps and fuel prices
   - Settings
4. Change the admin password in the app if you used a temporary seed password.

## 5. Redeploys

Redeploying is safe:

- Prisma migrations are applied with `migrate deploy`.
- The seed is idempotent and updates baseline records instead of duplicating
  them.
- Existing operational data such as shifts, readings, hand-ins and
  reconciliations is not deleted.

## 6. Useful local checks before pushing

```bash
pnpm lint
pnpm test
pnpm build
pnpm railway:build
```

To test the deployment start flow locally, point `DATABASE_URL` at a disposable
PostgreSQL database, then run:

```bash
pnpm railway:start
```

