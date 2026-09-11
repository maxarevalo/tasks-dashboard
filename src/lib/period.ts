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

/** Frecuencias de recurrencia disponibles para gastos fijos e ingresos. */
export const RECURRENCE_FREQUENCIES = [
  "monthly",
  "semiannual",
  "annual",
] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

const RECURRENCE_INTERVAL_MONTHS: Record<RecurrenceFrequency, number> = {
  monthly: 1,
  semiannual: 6,
  annual: 12,
};

/**
 * true si `period` corresponde a una ocurrencia de una recurrencia que
 * empieza en `start`, cada N meses según `frequency`:
 * - "monthly": todos los meses.
 * - "semiannual": cada 6 meses (ej. aguinaldo: arrancando en junio, cae en
 *   junio y diciembre de cada año).
 * - "annual": cada 12 meses, mismo mes calendario que `start`.
 */
export function periodMatchesCadence(
  start: Period,
  period: Period,
  frequency: RecurrenceFrequency = "monthly",
): boolean {
  if (period < start) return false;
  const interval = RECURRENCE_INTERVAL_MONTHS[frequency];
  return monthsBetween(start, period) % interval === 0;
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
