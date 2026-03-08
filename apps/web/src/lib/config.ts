/**
 * App config from env. All amounts are stored and displayed in a single unit
 * (e.g. XAF in Cameroon); no conversion. For tracking only.
 * Must reference import.meta.env.VITE_CURRENCY_LABEL directly so Vite inlines it.
 */
export const currencyLabel =
  (typeof import.meta.env.VITE_CURRENCY_LABEL === "string"
    ? import.meta.env.VITE_CURRENCY_LABEL.trim()
    : "") || null
