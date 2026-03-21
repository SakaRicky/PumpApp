## Real-world operations cadence

This document captures **how the business runs day to day** in the field, so product behavior and future reporting stay aligned with reality. It complements [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md) (technical rules) and [SLICES.md](SLICES.md) (implementation slices).

### Daily rhythm: shifts, cash, and reconciliation

- **Shifts** are the operational unit in the app. In practice, reconciliation is done **often** (typically **daily**, following closed shifts) so **cash and shift data do not accumulate** unreviewed.
- For a **closed shift** (often the previous day’s shift), **each seller who handled money** (shop seller, pump seller, etc.) is expected to have **handed in their cash** before or as part of closing out that shift from the owner’s perspective.
- **Cash hand-ins** are recorded **per shift**, with **which worker** handed in **how much**, for audit and accountability.

### Shop physical book: one book, one page per shift

For the **shop**, operations use **one physical record book for the whole shop**, with **one page per shift** (not one book per seller). On that page, for each relevant product, staff record (as applicable):

- quantity at the **beginning** of the shift,
- **purchases / receipts** for the day (including days when stock was received even if that product had no sales—needed for inventory coherence),
- **items sold**, **remaining**, and **totals for the shift**.

**Accountability:** for shop cash on that shift, **one designated shop seller** is responsible (a **manager does not** substitute in that accountable role).

### Daily: admin check and “daily missing cash”

At **end of day / shift**, the **admin** checks that the book numbers **add up** (counts, purchases, sales, remaining, and cash expectation). If they **do not** tie out, the gap is recorded as **missing cash for that day** (written in the operational record—not the same as “editing the book until it balances”). That daily figure is an **early signal** for supervision; it may later **agree or disagree** with the weekly result.

### Weekly: physical count with seller (authoritative for enforcement)

At **end of the weekly period**, the admin does a **physical product count on the shelves** **together with the seller**. They confirm **differences** against what the books implied. The **missing amount enforced** for accountability (e.g. salary impact) is the one established at this **weekly physical close**, because it is based on a **more rigorous** check than daily paperwork alone. **Daily missings and weekly missings may match or not**; when they differ, **weekly physical enforcement takes precedence**.

### Monthly: payroll

**Weekly missings** (from the physical-close process) accumulate into **monthly totals** that are **deducted from the seller’s salary**. In **rare** cases the balance can be **positive** (e.g. more cash or stock reality than expected); then **cash is paid to the seller** at month-end. (Product and labor law details are out of scope for this repo; the domain point is **short vs over** both exist and can flow to payroll.)

### Weekly rhythm: shop inventory vs daily money (summary)

At many stations the **shop** side follows a **weekly selling period**, not a daily full physical count:

- **Beginning of the week**: a **stock count** establishes the baseline for the week.
- **During the week**: sellers record shift pages in the **shop book**; a **full physical count of every SKU is not done every day**.
- **End of the week**: the **physical count with the seller** closes the loop and sets the **enforced** missing/variance for that week.
- **Every day**, the owner still **collects cash** and tracks **daily missing cash** when numbers do not tie; that is **informational until** the weekly physical reconciliation confirms or overrides the story.

### How this maps to PumpApp (Phase 1)

- **Per-shift reconciliation in the app** is **shift-scoped**: expected shop + fuel vs cash handed in for **that shift**, with a **derived discrepancy** (short / over). That aligns with **daily close** and attaching **cash to workers and shifts**. It is the **digital analogue** of “do the numbers tie for this shift?”—not yet a full model of **daily missing cash log** vs **weekly physical close** as separate persisted entities.
- **Physical shop counts** may be **weekly** in the real world while **digital** `ShiftProductStock` rows can still be entered **per shift** when the owner chooses. When a snapshot does not reflect reality for that shift, the owner may use **`MANUAL`** shop totals (with a reason) per [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md).
- **Daily missing cash** (written when the book does not balance) and **weekly enforced missing** (after physical count) are **operational concepts** the business uses for payroll. The app may later add **explicit** fields or reports for them; until then, **notes**, **reconciliation discrepancy**, and **aggregated reporting** by week/seller are the extension path—see [SLICES.md](SLICES.md) (S7) and [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md#operational-vs-app-reconciliation-payroll).

### UI and reporting expectations

- **Discrepancy** can be **positive or negative** (e.g. more cash handed in than system expectation). The UI should label **short** vs **over** clearly (e.g. copy and color), and reports should remain interpretable when the sign flips.
