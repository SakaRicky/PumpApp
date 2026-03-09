# Deployment guide

This guide covers deploying PumpApp with the frontend built into the backend (single deploy), using a Supabase PostgreSQL database and GitHub for secrets.

## 1. Supabase: create project and get connection string

### Create a project (if you don’t have one)

1. Go to [Supabase](https://supabase.com) and sign in.
2. Click **New project** → choose organization, project name (e.g. `pumpapp`), set a **database password** (save it somewhere safe), and pick a region.
3. Wait until the project is ready (green in the dashboard).

### Find the database connection string

1. In the **left sidebar**, click the **gear icon** (⚙️) at the bottom → **Project Settings**.
2. In the left menu of Project Settings, click **Database**.
3. Scroll to the **Connection string** section.
4. Choose the **URI** tab (not “Session” vs “Transaction” yet—you’ll see a single URI box).
5. Copy the connection string. It looks like:
   ```text
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   Or for **direct** (session) connection:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres
   ```
6. **Replace `[YOUR-PASSWORD]`** with the database password you set when creating the project. The string in the UI often shows `[YOUR-PASSWORD]` literally—you must substitute your real password.
7. **Add SSL** — Supabase requires encrypted connections. Append `?sslmode=require` to the URI (e.g. `...postgres?sslmode=require`). Without this, you may see "Can't reach database server" even with the correct password.
8. **Use either:**
   - **Transaction** (port **6543**, pooler URL): good for server apps and many connections.
   - **Session** (port **5432**, direct URL): also fine; use the “Session” or “Direct” connection string if you prefer.

Keep this full URL secret (do not commit it). You’ll use it as `DATABASE_URL` for migrations, seed, and the API.

### If you get "Can't reach database server"

- **Use the pooler (Transaction) URL instead of direct.** In Project Settings → Database → Connection string, switch to **Transaction** (or **Connection pooling**). Copy that URI — host will be like `aws-0-[region].pooler.supabase.com`, port **6543**, user `postgres.[project-ref]`. Replace the password, then add: `?sslmode=require` and for Prisma add `&pgbouncer=true&connection_limit=1`. Example shape:
  ```text
  postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
  ```
- **Resume the project.** Free-tier projects pause after inactivity. In the Supabase dashboard, open the project and click **Restore project** if you see it is paused.
- **Check firewall/VPN.** Ensure outbound TCP to port 6543 (or 5432) is allowed.

## 2. GitHub: add secrets and variables

1. On GitHub, open your repo → **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret** and add:

   | Name            | Description |
   |-----------------|-------------|
   | `DATABASE_URL`  | Full Supabase PostgreSQL URI (with your real password substituted). |
   | `JWT_SECRET`    | A long random string (e.g. run `openssl rand -base64 32` and paste the result). Use the same value when running the app. |

3. **VITE_API_URL** (for production build):  
   When you use **single deploy** (frontend built into the API), leave this **unset** or set it to **empty** in the build environment. The app then uses the same origin for `/api`. Only set `VITE_API_URL` (e.g. `https://api.yourdomain.com/api`) if you deploy the frontend and API on different hosts.

4. **Optional variables** (can be repo variables or in `.env.production`):  
   - `VITE_CURRENCY_LABEL` — e.g. `XAF` for Cameroon; shown next to prices. If you use it in the build, set it in the deploy workflow or in `.env.production`.

Use the secrets in your deployment workflow by mapping them to the app’s environment variables on your host. Do not commit secrets.

## 3. Run migrations on the remote (Supabase) database

From your machine (or from a CI job that has `DATABASE_URL`):

```bash
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@...supabase.com:6543/postgres" pnpm db:migrate:deploy
```

Or set `DATABASE_URL` in your environment once, then:

```bash
pnpm db:migrate:deploy
```

This applies all Prisma migrations to the Supabase database. Run this once per new database (or after adding migrations).

## 4. Seed the remote database

To load baseline data (e.g. dev admin user, categories, products) into Supabase:

```bash
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@...supabase.com:6543/postgres" pnpm db:seed
```

Or export `DATABASE_URL` and run:

```bash
pnpm db:seed
```

**Note:** The seed script is idempotent where possible. Default dev admin: `admin@pumpapp.local` / `admin123`. Change these in production or right after first login.

## 5. Build for production (frontend + backend in one)

At the repo root:

```bash
pnpm build:deploy
```

This will:

1. Build the web app (Vite) with production env (API URL = same origin).
2. Copy the web build into `apps/api/public/`.
3. Build the API (TypeScript → `apps/api/dist/`).

The deployable artifact is the **API app**: run it with Node and it will serve both the API and the static frontend.

## 6. Run the app in production

Set environment variables and start the API:

- `NODE_ENV=production`
- `DATABASE_URL` = your Supabase connection string
- `JWT_SECRET` = same value you stored in GitHub Secrets
- `PORT` = port the host expects (e.g. `8080` or leave unset if the platform sets it)

Then:

```bash
cd apps/api && node dist/server.js
```

Or from the repo root (if your start script runs the API):

```bash
pnpm --filter api start
```

The app will listen on `PORT` and serve:

- **API:** `https://your-domain/api/...`
- **Frontend:** `https://your-domain/` (and SPA routes like `/products`, `/login`, etc.)

## 7. Optional: deploy via GitHub Actions

To have GitHub Actions build and deploy on push to `main`:

1. Add a **deploy** job (or step) that runs after CI passes.
2. Use the **secrets** (`DATABASE_URL`, `JWT_SECRET`) in that job (e.g. pass them to your host’s CLI or API).
3. Run `pnpm build:deploy` in the workflow, then upload `apps/api/dist` and `apps/api/public` (or the whole `apps/api` folder) to your host, and run `node dist/server.js` with the env vars set.

Platform-specific steps (Railway, Render, Fly.io, etc.) differ; configure the service to use the same env vars and start command above.

## Summary checklist

- [ ] Supabase project created; connection string (with password) copied.
- [ ] GitHub Actions secrets set: `DATABASE_URL`, `JWT_SECRET`.
- [ ] Migrations applied: `DATABASE_URL=... pnpm db:migrate:deploy`.
- [ ] Remote DB seeded (optional): `DATABASE_URL=... pnpm db:seed`.
- [ ] Local build test: `pnpm build:deploy` then run API with `NODE_ENV=production` and the same env vars.
- [ ] Deploy the API (with `dist/` and `public/`) and set env vars on the host.
