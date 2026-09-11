/** Una fecha en formato "YYYY-MM-DD". */
export type DateStr = string;

export function todayStr(): DateStr {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(date: DateStr, days: number): DateStr {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate(),
  ).padStart(2, "0")}`;
}

export function dateLabel(date: DateStr): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

/** Interés simple: capital * TNA/100 * (días/365). */
export function plazoFijoMaturityAmount(
  principal: number,
  tna: number,
  termDays: number,
): number {
  return principal * (1 + (tna / 100) * (termDays / 365));
}

/** Equivalente mensual "de bolsillo" de una TNA (sin capitalizar): TNA/12. */
export function tnaToMonthlyPct(tna: number): number {
  return tna / 12;
}
