# PumpPro design language

This document defines the design principles, visual direction, and theme usage for PumpPro (PumpApp). It is the single source of truth for how the UI should look and behave. The theme is implemented in `apps/web/src/index.css`; all components should use the semantic tokens defined there.

## 1. Design principles

- **Clarity and hierarchy** — Numbers (money, volumes, discrepancies) and actions (reconcile, hand-in, enter readings) are primary. Secondary information (metadata, timestamps) is visually de-emphasized. Prefer one primary action per screen or section.
- **Trust and auditability** — Data should look authoritative: aligned numbers, clear labels, explicit "source" and "override" cues. Destructive or override actions use `destructive` or `warning` semantics and optional confirmation.
- **Efficiency** — Dense but scannable: compact tables (TanStack Table), clear column headers, consistent spacing so staff can work quickly without losing context. Sidebar/nav reflects task frequency (e.g. Shifts, Reconciliation, Reports).
- **Restraint** — No decorative flair; neutral palette with a single accent (primary) for actions and key highlights. Avoid generic aesthetics; prefer a distinct but professional look.
- **Accessibility** — Contrast (WCAG AA), focus rings (`--ring`), and adequate touch targets for office, back office, and tablet use.

## 2. Visual direction

- **Overall feel**: Operational dashboard / back-office tool, not a consumer app. Clean, light-default UI with clear structure; optional dark mode for long shifts.
- **Layout**: Persistent sidebar (or collapsible/top nav on small screens) with grouped items (e.g. Operations, Master data, Reports). Main content: breadcrumbs + page title, then cards/sections with consistent padding and borders.
- **Data**: Tables are the default for lists and reports (TanStack Table + shadcn Table). Key metrics in small cards or a compact KPI strip (e.g. shift totals, discrepancy). Numbers right-aligned; currency and units always visible (e.g. "ZAR", "L").
- **Forms**: One column on desktop; grouped fields with clear labels and inline validation (RHF + Zod). Primary button for submit; secondary for cancel/back. Danger actions (e.g. override) use destructive styling.
- **Feedback**: Toasts for success/error; inline errors on forms. For critical outcomes (e.g. reconciliation saved, discrepancy above threshold), combine toast with optional inline summary.

## 3. Token semantics

All color and radius tokens live in `apps/web/src/index.css`. Use them via Tailwind classes (e.g. `bg-primary`, `text-muted-foreground`). Do not introduce one-off hex or HSL values in components.

| Token                                                   | Use                                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `primary` / `primary-foreground`                        | Main actions (Save, Submit, Confirm), key CTAs, active nav state                          |
| `secondary` / `secondary-foreground`                    | Secondary actions (Cancel, Back), tabs, subtle emphasis                                   |
| `destructive` / `destructive-foreground`                | Overrides, delete, irreversible actions                                                   |
| `muted` / `muted-foreground`                            | Secondary text, captions, timestamps, metadata                                            |
| `accent` / `accent-foreground`                          | Hover states, optional highlights                                                         |
| `success` / `success-foreground`                        | Confirmations, "recon complete", positive resolution                                      |
| `warning` / `warning-foreground`                        | Alerts (e.g. purchase price increase), near-threshold discrepancy, optional confirmations |
| `background`, `foreground`                              | Page and body                                                                             |
| `card`, `card-foreground`                               | Cards, panels, table containers                                                           |
| `border`, `input`, `ring`                               | Borders, inputs, focus rings                                                              |
| `chart-1` … `chart-5`                                   | Reports and profit charts; use consistently across all charts                             |
| `--radius`, `--radius-sm`, `--radius-md`, `--radius-lg` | Border radius; use semantic scale for cards vs modals                                     |

## 4. Guidelines

### Tables

- Use shadcn Table with TanStack Table for sortable, filterable data.
- Right-align numeric columns (amounts, volumes, counts).
- Always show units or currency in column headers or a single legend (e.g. "Amount (ZAR)", "Volume (L)"). For money, use the optional `VITE_CURRENCY_LABEL` (e.g. `XAF` for Cameroon); single unit only, no conversion—for tracking only.
- Use `muted-foreground` for secondary columns; keep primary data in `foreground`.

### Forms

- One column on desktop; group related fields with a visible label per group.
- Primary button = submit/confirm; secondary = cancel or back. Danger actions use `variant="destructive"`.
- Inline validation errors below or next to the field; use `destructive` or semantic error color for message text.

### Spacing and density

- Card padding: `p-4` (compact) or `p-6` (default). Use consistently per section type.
- Page content: `p-4` or `p-6` from viewport edge; match sidebar content width rhythm.
- Tables: default row height from shadcn Table; avoid excessive padding so density stays high.

### Dark mode

- Toggle via `.dark` on a root element (e.g. `html` or app wrapper). All semantic tokens have `.dark` overrides in `index.css`.
- Sidebar, cards, and tables must use semantic tokens (`background`, `card`, `border`) only—no hard-coded light/dark colors in components.

### Icons

- **Icon pack**: [Lucide React](https://lucide.dev/) — outline style, tree-shakeable, accessible.
- **Usage**: Import from `@/components/icons`. A barrel file re-exports a curated set (e.g. `LayoutDashboard`, `CalendarClock`, `Scale`, `Package`, `BarChart3`, `Plus`, `Pencil`, `Trash2`, `CheckCircle`, `AlertCircle`); add new Lucide icons there when needed.
- **Sizing**: Use Tailwind size classes (`size-4`, `size-5`) or the `<Icon icon={...} size="sm" />` wrapper for consistent dimensions. Sidebar nav icons: `size-4`; header/brand: `size-5`.
- **A11y**: Icons used as decoration (e.g. next to labels) should have `aria-hidden`. Icon-only buttons must have an `aria-label`.

## 5. References

- Theme implementation: `apps/web/src/index.css`
- Tailwind config (extends tokens): `apps/web/tailwind.config.js`
- Component library: shadcn/ui (new-york, neutral base); config: `apps/web/components.json`

Inspiration for layout and hierarchy (not for copying branding): Vercel Dashboard, Linear, Stripe Dashboard, shadcn examples (dashboards, sidebars).
