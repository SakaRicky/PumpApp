## PumpApp Daily Workflow Guide

This document is your **day-to-day script** for supervising agents while they implement PumpApp.
It is based on the implementation plans in `docs/IMPLEMENTATION-ORDER.md` and `pumpapp_agent_workflow_plan_58c88a44.plan.md`.

---

## 1. Before you start work

1. **Open the key docs** (read-only reference):
   - Product: `/Users/rickysaka/Documents/PumpApp/docs/REQUIREMENTS.md`.
   - Domain decisions: `/Users/rickysaka/Documents/PumpApp/docs/DOMAIN-DECISIONS.md`.
   - Database: `/Users/rickysaka/Documents/PumpApp/docs/DATABASE.md`.
   - API: `/Users/rickysaka/Documents/PumpApp/docs/API-DESIGN.md`.
   - Implementation checklist: `/Users/rickysaka/Documents/PumpApp/docs/IMPLEMENTATION-ORDER.md`.

2. **Check the current slice and todos**:
   - Which foundation slice (F0–F5) or feature slice (S1–S8) are you on?
   - Review the todos in `pumpapp_agent_workflow_plan_58c88a44.plan.md` and in Cursor’s todo panel.

3. **Decide the focus for this session**:
   - Either a **foundation step** (F0–F5), or
   - A **single feature slice** (S1–S8), e.g. “S1 – Auth & Users/Workers”.

Write down: *"Today’s focus: [slice name] – [short description]"* in your own notes.

---

## 2. Per-slice workflow (S1–S8)

For any slice (S1–S8), follow this loop in order.

### 2.1 Design task

1. Ask the agent to **re-read** (and reference) these files for the slice:
   - `/Users/rickysaka/Documents/PumpApp/docs/REQUIREMENTS.md`
   - `/Users/rickysaka/Documents/PumpApp/docs/DOMAIN-DECISIONS.md`
   - `/Users/rickysaka/Documents/PumpApp/docs/DATABASE.md`
   - `/Users/rickysaka/Documents/PumpApp/docs/API-DESIGN.md`

2. Have the agent produce a **small design note** for the slice:
   - What tables/fields are involved?
   - What endpoints will exist or change?
   - What UI screens/flows will be touched?

3. **You review** that design note:
   - Check consistency with `DOMAIN-DECISIONS.md`.
   - Check scope against `REQUIREMENTS.md` (no out-of-scope features).
   - Approve or request changes **before** any code.

### 2.2 Branch setup

1. In Git (you or an agent):
   - Ensure `main` is clean and up to date.
   - Optionally maintain `develop` as an integration branch.
2. Create a feature branch:
   - `feature/s1-auth-users` (example – follow the pattern from the plan).
3. Confirm the agent will **only commit to this branch** for this slice.

### 2.3 Schema & migration task

1. Agent updates `db/schema.prisma` for this slice (if needed).
2. Agent explains **exactly** which models/enums changed and why.
3. Agent writes or updates migration scripts and notes.
4. You review the **schema diff only**:
   - Compare against `docs/DATABASE.md` and `docs/DOMAIN-DECISIONS.md`.
   - Confirm no breaking or out-of-scope changes.

### 2.4 Shared types & validation task

1. Agent updates `packages/shared`:
   - Enums, DTOs, and Zod schemas relevant to this slice only.
2. Agent shows where these are used in both API and web.
3. You check that types map cleanly to the Prisma models and API design.

### 2.5 API implementation task

1. Agent implements backend logic in `apps/api`:
   - Controllers / route handlers.
   - Services / business logic.
   - Wiring into routes and middleware.
2. Agent **must**:
   - Use shared Zod schemas for validation.
   - Respect roles and access rules.
3. Agent adds or updates tests for this slice.
4. You review:
   - Endpoint signatures vs `docs/API-DESIGN.md`.
   - Business rules vs `docs/REQUIREMENTS.md` and `docs/DOMAIN-DECISIONS.md`.

### 2.6 UI implementation task

1. Agent implements or updates UI in `apps/web`:
   - Screens, forms, tables for this slice.
   - Uses React Hook Form + Zod + shadcn/ui.
2. Agent explains the UX flow in plain language.
3. You check the flow matches **how the owner would actually work** in the station.

### 2.7 Refinement & PR

1. Agent addresses your comments and improves tests/UX where needed.
2. Agent prepares a **PR description** that includes:
   - Which slice (e.g. S1) and sub-tasks were done.
   - References to relevant docs (`REQUIREMENTS`, `DOMAIN-DECISIONS`, etc.).
3. CI runs on the branch (see Section 3).
4. You:
   - Check CI results.
   - Optionally verify behaviour on staging.
   - Approve and merge PR into `develop` or `main`.

Mark the slice todo as **completed** only after the PR is merged.

---

## 3. CI and staging checklist

Whenever a PR is opened or updated, expect CI to:

1. **Install**: `pnpm install` at repo root.
2. **Lint & type-check**:
   - `pnpm lint`
   - `pnpm -r typecheck` or `tsc -p tsconfig.base.json --noEmit`
3. **Test**:
   - `pnpm test` (backend; later frontend as well).
4. **Build**:
   - `pnpm --filter api build`
   - `pnpm --filter web build`
5. **DB checks** (once Prisma wired):
   - `pnpm db:generate`
   - Optionally apply migrations against a disposable Postgres.

For branches that should be previewed:

- CI deploys API + web to a **staging environment** using a separate `DATABASE_URL`.
- You test the feature on staging **before** approving the PR.

---

## 4. Daily supervision checklist (short version)

Use this as a quick daily ritual:

1. **Orient**
   - Read the relevant slice in `pumpapp_agent_workflow_plan_58c88a44.plan.md`.
   - Scan `docs/IMPLEMENTATION-ORDER.md` to see where you are.

2. **Define today’s target**
   - Pick **one** concrete sub-task: design, schema, API, UI, or tests for a slice.

3. **Guide the agent**
   - Tell the agent explicitly: *"Today, focus on [slice] – [sub-task]."*
   - Require references to the right docs in their reasoning.

4. **Review diffs, not just summaries**
   - Look at code changes per file.
   - Compare against the docs when something feels off.

5. **Watch CI and staging**
   - Don’t merge red builds.
   - Prefer testing behaviour on staging (especially for reconciliation logic).

6. **Close the loop**
   - If a sub-task is truly done, mark the corresponding todo as **completed**.
   - Decide the **next sub-task** for tomorrow, write it down.

---

## 5. When you feel lost

If at any point you’re unsure:

1. Re-read `docs/REQUIREMENTS.md` (product intent) and `docs/DOMAIN-DECISIONS.md` (hard decisions).
2. Re-check which slice you’re on and what remains for that slice.
3. Ask the agent to **summarize in one paragraph**:
   - What changed,
   - Which user workflow it supports,
   - Which docs it is based on.

Use this workflow document as the anchor: if an agent’s proposal does not fit this structure (slice, sub-tasks, branches, CI, staging, review), you can push back and realign them.
