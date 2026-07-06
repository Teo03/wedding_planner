import type { Currency } from "../api/types";

// MKD is de-facto pegged to EUR; this is the reference rate. In production
// this would come from the National Bank of North Macedonia via a scheduled
// job (see docs Phase 6.2). Kept as one constant for the demo.
export const MKD_PER_EUR = 61.5;

export function convert(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  return to === "MKD" ? amount * MKD_PER_EUR : amount / MKD_PER_EUR;
}

export function formatMoney(amount: number, currency: Currency): string {
  const rounded = currency === "MKD" ? Math.round(amount) : amount;
  const formatted = rounded.toLocaleString("en-US", {
    minimumFractionDigits: currency === "MKD" ? 0 : 2,
    maximumFractionDigits: currency === "MKD" ? 0 : 2,
  });
  return currency === "MKD" ? `${formatted} ден` : `€${formatted}`;
}
