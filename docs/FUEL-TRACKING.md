# Fuel tracking

This document describes how PumpPro tracks fuel: purpose, formulas, tank model, and how it fits with shift reconciliation. For schema details see [DATABASE.md](DATABASE.md); for domain decisions see [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md).

## Purpose

PumpPro tracks fuel movement at the petrol station in order to:

- **Estimate fuel sold** from pump meter readings.
- **Reconcile** expected money (shop + fuel) vs cash handed in.
- **Detect discrepancies** and support investigation.
- **Monitor fuel inventory** in underground tanks.
- **Detect operational problems** such as theft, leaks, or recording errors.

Unlike shop products, fuel is not recorded per transaction. The system estimates fuel sold using pump meter readings.

## Fuel sales calculation

Fuel pumps have mechanical or electronic meters that accumulate total fuel dispensed. At the start and end of each operational period (usually a shift), the owner or staff record the pump readings.

**Formula:**

```
fuel_sold = closing_reading − opening_reading
```

Example: opening = 100000 L, closing = 100250 L → fuel_sold = 250 L.

This method is common when individual fuel transactions are not recorded digitally.

## Tanks and storage

Fuel sold through pumps comes from storage tanks. Each tank holds one fuel type. Multiple pumps may draw from the same tank.

**Hierarchy:**

```
FuelType
  └ Tank
        └ Pump(s)
```

Example: Diesel → Tank 1 → Pump 1, Pump 2.

## Tank quantity

The system tracks how much fuel should theoretically remain in each tank after sales and deliveries. This supports discrepancy detection.

**Formula:**

```
tank_quantity = previous_quantity − fuel_sold + fuel_deliveries
```

Example: start 8000 L, fuel_sold 250 L, delivery 0 → end 7750 L.

## Theoretical vs actual quantity

PumpPro distinguishes two tank quantities:

1. **Theoretical quantity** — Calculated by the system from recorded events:
   - previous quantity − fuel_sold (from pump readings) + fuel_deliveries  
     Assumes readings and deliveries are correct and no fuel was lost.

2. **Actual quantity** — The physically measured level in the tank (manual dip or electronic sensor), entered periodically.

**Why it matters:** The difference (theoretical − actual) can indicate theft, leakage, wrong pump readings, wrong delivery entry, or measurement error. The system provides the data for the owner to investigate; it does not automatically accuse or penalize workers.

## Relationship to shift reconciliation

Fuel tracking integrates with shift reconciliation:

- **Shop sales** + **fuel revenue** + **cash handed in** are compared.
- Fuel revenue: `fuel_revenue = fuel_sold × fuel_price` (from pump readings and fuel price for the shift).
- This feeds into **expected total sales**, which is compared to **cash_handed_in** to compute the discrepancy.

See [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md) for reconciliation and fuel revenue rules.

## Design choice: fuel separate from shop products

Fuel is **not** modeled as a shop Product or ShopSaleItem. Fuel types (e.g. Diesel, Petrol) are represented by the **FuelType** entity; tanks, deliveries, and tank quantity (theoretical vs actual) belong to this fuel subdomain. This keeps:

- **Shop**: per-product inventory and sales lines (or shift-end shop total).
- **Fuel**: meter-based volume, tank inventory, and deliveries.

See [DOMAIN-DECISIONS.md](DOMAIN-DECISIONS.md) for the rationale.
