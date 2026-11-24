/**
 * Integer minor units → the major-unit number a currency formatter expects.
 * The number of decimals comes from `Intl` (EUR 2, JPY 0, KWD 3), so there is no
 * hard-coded `/ 100`. This is display only: all money MATHS stays on ep-api.
 */
export function centsToMajor({ cents, currency }: { cents: number; currency: string }): number {
  let digits = 2;
  try {
    digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    digits = 2; // unknown currency code: the formatter call will degrade too
  }
  return cents / 10 ** digits;
}
