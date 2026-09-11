/** Un período es un mes, en formato "YYYY-MM". */
export type Period = string;

export function isValidPeriod(value: string): value is Period {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function currentPeriod(): Period {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function normalizePeriod(value: string | undefined | null): Period {
  return value && isValidPeriod(value) ? value : currentPeriod();
}

function parts(period: Period): [number, number] {
  const [y, m] = period.split("-").map(Number);
  return [y, m];
}

export function addMonths(period: Period, delta: number): Period {
  const [y, m] = parts(period);
  const base = new Date(y, m - 1 + delta, 1);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

/** Lista de períodos [from, from+1, ... ] con `count` elementos. */
export function periodRange(from: Period, count: number): Period[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => addMonths(from, i));
}

/** true si `a` <= `b` en el tiempo. */
export function periodLte(a: Period, b: Period): boolean {
  return a <= b; // el formato YYYY-MM ordena lexicográficamente
}

export function periodInRange(
  period: Period,
  start: Period,
  end?: Period | null,
): boolean {
  return period >= start && (!end || period <= end);
}

/** Cantidad de meses entre `a` y `b` (b - a). Puede ser negativo. */
export function monthsBetween(a: Period, b: Period): number {
  const [ay, am] = parts(a);
  const [by, bm] = parts(b);
  return (by - ay) * 12 + (bm - am);
}

/**
 * true si `period` corresponde a una ocurrencia de una recurrencia que
 * empieza en `start`: todos los meses si es "monthly", o cada 12 meses
 * (mismo mes calendario que `start`) si es "annual".
 */
export function periodMatchesCadence(
  start: Period,
  period: Period,
  frequency: "monthly" | "annual" = "monthly",
): boolean {
  if (period < start) return false;
  if (frequency === "annual") return monthsBetween(start, period) % 12 === 0;
  return true;
}

export function periodLabel(period: Period): string {
  const [y, m] = parts(period);
  const label = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function periodShortLabel(period: Period): string {
  const [y, m] = parts(period);
  const label = new Intl.DateTimeFormat("es-AR", { month: "short" }).format(
    new Date(y, m - 1, 1),
  );
  return `${label.replace(".", "")} ${String(y).slice(2)}`;
}
