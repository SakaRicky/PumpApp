## Real-world operations cadence

This document captures **how the business runs day to day** in the field, so product behavior and future reporting stay aligned with reality. It complements [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md) (technical rules) and [SLICES.md](SLICES.md) (implementation slices).

### Daily rhythm: shifts, cash, and reconciliation

- **Shifts** are the operational unit in the app. In practice, reconciliation is done **often** (typically **daily**, following closed shifts) so **cash and shift data do not accumulate** unreviewed.
- For a **closed shift** (often the previous day’s shift), **each seller who handled money** (shop seller, pump seller, etc.) is expected to have **handed in their cash** before or as part of closing out that shift from the owner’s perspective.
- **Cash hand-ins** are recorded **per shift**, with **which worker** handed in **how much**, for audit and accountability.

### Weekly rhythm: shop inventory vs daily money

At many stations the **shop** side follows a **weekly selling period**, not a daily full physical count:

- **Beginning of the week**: a **stock count** establishes the baseline for the week.
- **During the week**: sellers often **track sales in their own notebook** (units or amounts). A **full physical product count is not done every day**.
- **End of the week**: another **stock count** is done; together with the opening count, the owner can see **how much was sold over the week** and compare it to expectations.
- **Every day**, the **business owner still collects cash** from sellers and tracks it **against that week**. At **week end**, they reconcile **the sum of daily cash collected** with the **weekly movement implied by opening/closing counts** (and the seller’s book), to justify or confirm numbers.

### How this maps to PumpApp (Phase 1)

- **Per-shift reconciliation in the app** is still **shift-scoped**: expected shop + fuel vs cash handed in for **that shift**, with a **derived discrepancy**. That matches the need to **close out shifts regularly** and attach **cash to workers and shifts**.
- **Physical shop counts** may be **weekly** in the real world while **digital** `ShiftProductStock` rows can still be entered **per shift** when the owner chooses (e.g. when they do counts, or interim entries). When a full physical count has **not** happened for that shift, the owner may use **`MANUAL`** shop totals (with a reason) or other agreed process until the weekly count closes the loop.
- **Matching “all daily cash for the week” to “weekly stock-derived sales”** is a **cross-period** check. The core schema stays **per shift**; **aggregated reports** (e.g. by calendar week, by seller) can support that verification in a later reporting slice—see [SLICES.md](SLICES.md) (S7) and [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md).

### UI and reporting expectations

- **Discrepancy** can be **positive or negative** (e.g. more cash handed in than system expectation). The UI should label **short** vs **over** clearly (e.g. copy and color), and reports should remain interpretable when the sign flips.
