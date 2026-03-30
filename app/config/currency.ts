export const DEFAULT_CURRENCY = "MXN" as const;

/**
 * Format an amount for display using the app's current currency.
 * When a user-level currency setting is added (users/{uid}/settings/main),
 * pass it here instead of relying on the default.
 */
export function formatAmount(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
}
