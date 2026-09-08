export type Currency = "ARS" | "USD";

export const CURRENCIES: Currency[] = ["ARS", "USD"];

const formatters: Record<Currency, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }),
};

export function formatMoney(amount: number, currency: Currency): string {
  return formatters[currency].format(amount || 0);
}

/** Objeto { ARS: n, USD: n } en cero. */
export function emptyTotals(): Record<Currency, number> {
  return { ARS: 0, USD: 0 };
}

export function addToTotals(
  totals: Record<Currency, number>,
  currency: Currency,
  amount: number,
): void {
  totals[currency] += amount || 0;
}
