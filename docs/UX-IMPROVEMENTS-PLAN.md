# Implementation plan — daily-cycle UX improvements

**Status:** proposed · **Date:** 2026-07-03 · **Baseline:** lint ✓ build ✓ 182/182 tests ✓
**Scope:** five improvements identified after the P0–P5 build-out (see `GAP_ANALYSIS.md`).
None of them require a database migration; item 2 uses the existing `Setting` entity.

Order of execution (small wins first, the wizard last because it composes the others):

| # | Item | Size | Depends on |
|---|------|------|-----------|
| 1 | Stale-open-shift nudge on the dashboard | S (~2 h) | — |
| 2 | Dashboard quick actions | S (~½ day) | 1 (shares dashboard payload change) |
| 3 | Reading sanity guards (per-shift volume ceiling) | M (~1 day) | — |
| 4 | Shop-stock closing helper | M (~1 day) | — |
| 5 | Guided day-close wizard « Clôturer la journée » | L (2–4 days) | 3, 4 |

Shared definition of done for every item (matches the project's conventions):
type-checks and lints clean; mock-based integration tests in `apps/api/src/routes/*.integration.test.ts`;
every new state change writes a journal `Event` inside the same transaction; locks enforced at the
API layer (reconciled shifts stay immutable); French-first labels in both `fr.json` and `en.json`;
`pnpm lint && pnpm build && pnpm test` green before merge.

---

## 1. Stale-open-shift nudge (dashboard)

**Problem.** The pending queue (`buildPendingQueue` in
`apps/api/src/controllers/dashboardController.ts`) only lists `CLOSED` shifts awaiting
reconciliation. A shift left `OPEN` or `PLANNED` from a previous day — the more dangerous
oversight, since nothing is recorded yet — is invisible.

**API.**
- In `dashboardController.ts`, add `staleOpenShifts: DashboardPendingShift[]` to the response:
  shifts with `status IN (PLANNED, OPEN)` and `date < startOfDay(now)`, same `ageDays` math as
  the pending queue. Reuse the `DashboardPendingShift` DTO — no new type needed beyond the field
  on `DashboardResponse` (`packages/shared/src/dto/index.ts`).

**Web.**
- `HomePage.tsx`: inside the existing « Réconciliations en attente » card, render a separate
  subsection « Postes non clôturés » above the reconciliation entries, each row linking to
  `/shifts`, badge red from age ≥ 1 day (stricter than the reconciliation badges — an unclosed
  shift from yesterday is always wrong).
- i18n: `home.pending.staleTitle`, `home.pending.staleItem`.

**Tests.** Extend `dashboard.integration.test.ts`: an `OPEN` shift dated yesterday appears in
`staleOpenShifts` with `ageDays: 1`; today's `OPEN` shift does not.

**Acceptance.** An OPEN shift from yesterday shows on the dashboard within one load, with a red
age badge; closing it makes it move to the reconciliation queue.

---

## 2. Dashboard quick actions

**Problem.** The daily cycle starts from the Shifts page; the dashboard is read-only. The mockups
(and the spec's §6.1) treat the dashboard as the launchpad.

**API.**
- Extend `DashboardToday` with `currentShiftId: number | null` and
  `currentShiftStatus: ShiftStatus | null` — today's `PLANNED`/`OPEN` shift if one exists (the
  same lookup `quickOpen` already performs for its 409 check; extract it into a small helper in
  `shiftController.ts` or a `services/todayShift.ts` used by both).

**Web.**
- New « Actions rapides » card on `HomePage.tsx` (grid of icon buttons, mirroring the mockup's
  Quick Actions row):
  - **Ouvrir le poste** — visible when `currentShiftId === null`; calls `api.quickOpenShift()`
    then refreshes the dashboard. On 409, falls back to navigating to `/shifts`.
  - **Saisir les relevés** — visible when a current shift exists; navigates to `/shifts`
    (post-item-5: deep-link to the wizard step 1).
  - **Réconcilier** — navigates to `/reconciliation`; badge with the pending count.
  - **Dépense** / **Dépôt** — navigate to `/money` (admin only).
- Buttons respect roles the same way the sidebar does (`useAuth`).
- i18n: `home.actions.*`.

**Tests.** Dashboard integration test asserts `currentShiftId` populated when today has an OPEN
shift and null otherwise. UI is covered by the browser smoke pass (screenshot script in the
session scratchpad pattern, or manual).

**Acceptance.** From a fresh morning state, one click on the dashboard opens today's shift; the
card then flips to « Saisir les relevés ».

---

## 3. Reading sanity guards (per-shift volume ceiling)

**Problem.** `pumpReadingController.ts` only enforces `closing ≥ opening`. A typo
(126 890 → 1 268 900) silently produces an absurd volume, poisoning revenue, tank theoretical
levels, and reconciliation. Spec §4.3: *reject if liters_sold > configurable per-shift ceiling
(default: tank capacity)*.

**Design.**
- **Ceiling resolution** (new `services/readingGuards.ts`):
  1. `Setting` key `readings.maxVolumePerShiftLiters` (station-wide override) if present;
  2. else the pump's tank `capacity`;
  3. else no ceiling (guard disabled — log nothing).
- **Hard reject** in `createForShift` and `updateReading`: computed volume > ceiling → 422
  `VALIDATION_ERROR` with a message carrying the volume and ceiling. Admins can force through by
  sending `overrideCeiling: true` + `overrideReason` (added to `pumpReadingCreateSchema` /
  `pumpReadingUpdateSchema` in `packages/shared`); the journal event payload gains
  `{ ceilingExceeded: true, ceiling, overrideReason }` so audits can find forced readings.
- **Soft warning (client only):** volume > 3× the pump's average over its last 5 readings →
  amber inline hint in the readings dialog, no server round-trip needed if the prefill endpoint
  is extended to also return `recentAverageVolume` per pump (cheap: it already scans prior
  readings; compute the mean of the last 5 per pump in the same pass).

**Web.**
- Readings dialog (`ShiftsPage.tsx`): live volume per row already implicit — surface it
  (computed `closing − opening` next to each row), amber text when above 3× average, red when
  above the ceiling. On 422 with ceiling error, show a confirm block: « Dépassement du plafond
  (X L > Y L). Forcer l'enregistrement ? » with a required reason field → resubmits with
  `overrideCeiling`.
- i18n: `shifts.guards.*`.

**Tests.**
- Unit tests for `resolveVolumeCeiling` (setting > tank capacity > none).
- Integration: create reading above tank capacity → 422; with `overrideCeiling` + reason → 201
  and the event payload records the override; non-admin override attempt → 403.

**Acceptance.** Entering a closing index that implies more litres than the tank holds is blocked
with a clear French message; an admin can force it with a reason, and that reason is visible in
the audit log.

---

## 4. Shop-stock closing helper

**Problem.** In the stock dialog every closing field starts empty, so the seller re-types the
full count for lines that didn't move — the most common case. The server already defaults
*opening* from the previous shift's closing (`upsertStock`), but *closing* entry is raw.

**Design (client-only; no API change).**
- In the stock dialog (`ShiftsPage.tsx`, `openStock`/stock rows):
  - **Pre-fill closing = opening + received** (« rien vendu ») for rows with no saved closing;
    visually mark pre-filled values as suggestions (muted style) until touched.
  - **Live derived columns per row:** `sold = opening + received − closing` and
    `value = sold × sellingPrice` (products list already carries `sellingPrice`); red highlight
    and a blocking banner when any `sold < 0` (mirrors the API's own guard).
  - **Footer totals:** total sold value = expected shop cash preview, matching what the
    reconciliation will derive — the owner sees the day's expected shop cash before closing.
  - **« Tout remplir » button** applies the no-sale suggestion to all untouched rows; rows the
    user edits keep their value.
- Keyboard flow: Enter advances to the next row's closing field (small `onKeyDown` handler).
- i18n: `shifts.stock.prefillHint`, `shifts.stock.fillAll`, `shifts.stock.expectedTotal`.

**Tests.** The derivation math is already unit-tested server-side (`shopShiftRevenue`); add a
small pure helper `deriveStockRow(opening, received, closing, price)` in the web app only if the
logic is extracted — otherwise browser smoke check. (Client-only change; API suite untouched.)

**Acceptance.** Closing a quiet shift where three products sold requires editing exactly three
fields; the dialog shows the expected shop cash total before saving; negative sold is impossible
to submit.

---

## 5. Guided day-close wizard — « Clôturer la journée »

**Problem.** Closing a day means visiting four dialogs in the right order plus a status change,
then remembering to go to Reconciliation. The spec (§6.2/§6.3) describes this as one wizard.

**UX.** Full-page route `/shifts/:id/close` (admin-only), a 4-step stepper:

1. **Relevés pompes** — the readings grid (openings pre-filled from last closings via the
   existing prefill endpoint; sanity guards from item 3; live per-pump volume and revenue
   preview using the fuel price in force).
2. **Stock boutique** — the stock grid with the item-4 helper (no-sale pre-fill, derived sold,
   expected-cash total).
3. **Jaugeage cuves** *(optional, skippable)* — one input per active tank posting to the
   existing `POST /tanks/:id/level-readings`; immediately shows variance vs theoretical and the
   tolerance verdict (`varianceWithinTolerance` is already surfaced by the API).
4. **Récapitulatif & clôture** — read-only summary: fuel volume + revenue per pump, shop
   expected cash, dips recorded, plus blocking issues (missing readings, negative sold) and
   warnings (no dip today, ceiling overrides used). The « Clôturer le poste » button issues the
   existing `PATCH /shifts/:id { status: CLOSED }` (all close preconditions stay server-side —
   the wizard surfaces them early instead of at the final click). On success: confirmation with
   « Enregistrer les remises maintenant » → `/reconciliation?shiftId=:id` (ReconciliationPage
   gains support for a `shiftId` query param preselecting the shift).

**API.** One new read endpoint to avoid client-side stitching:
- `GET /shifts/:id/close-preview` → `{ pumps: [{pumpId, name, opening, closing, volume, price,
  revenue} …], fuelTotal: {volume, revenue|null, error|null}, shop: {lines, expectedTotal,
  negativeLines}, dipsToday: [{tankId, measuredAt, variance, withinTolerance}], blockers:
  string[], warnings: string[] }`. Implemented in a new `services/closePreview.ts` composing
  `fuelRevenue`, `shopShiftRevenue` and the tank data; read-only, no events.
- Everything else reuses existing endpoints — no schema change, no new mutations.

**Web structure.**
- New `ShiftClosePage.tsx` + a small `Stepper` UI component (`components/ui/stepper.tsx`).
- Extract the readings grid and stock grid out of `ShiftsPage.tsx` into reusable components
  (`components/shift/PumpReadingsGrid.tsx`, `components/shift/StockCountGrid.tsx`) consumed by
  both the old dialogs and the wizard — this is the main refactor risk; do it as a pure
  extraction commit first (no behavior change, tests green) before building the wizard on top.
- Entry points: « Clôturer » button on each OPEN shift row in `ShiftsPage`, and the dashboard
  quick action (item 2) once the shift is open.
- i18n namespace `closeWizard.*` (fr first).

**Tests.**
- `closePreview` integration tests: blockers include « missing pump readings » when a pump has
  none; shop `negativeLines` populated when closing > opening+received is impossible (negative
  sold detection); fuel error surfaced when no price is in force.
- ReconciliationPage `shiftId` param: unit-level check that preselection happens.
- Browser smoke: run through the wizard end-to-end against the dev DB (open shift → readings →
  stock → skip dip → close → land on reconciliation).

**Acceptance.** A manager closes a complete day from one screen without knowing the app's
information architecture; every blocking problem is shown on the step where it can be fixed; the
final click cannot fail for a reason the wizard didn't already display.

---

## Risks & notes

- **Refactor risk (item 5).** Extracting the grids from the 1 600-line `ShiftsPage.tsx` is the
  only structurally risky step; isolate it in its own commit with unchanged behavior.
- **Timezone.** Stale-shift and « today » logic reuses the server-local `startOfDay` convention
  already used by the dashboard and quick-open; when the `station.timezone` setting starts being
  honored, all three read from one helper (`services/todayShift.ts`) so there is a single place
  to fix.
- **No migrations.** All five items ship without touching `schema.prisma`; item 3's ceiling is
  a `Setting` row (`readings.maxVolumePerShiftLiters`), editable via the existing
  `PUT /api/settings/:key`.
- **Journal coverage.** New mutations: none except ceiling-overridden readings, which enrich the
  existing `PUMP_READING_*` event payloads — audit invariants hold with no new event types.
