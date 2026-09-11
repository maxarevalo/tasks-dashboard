/** Una fecha en formato "YYYY-MM-DD". */
export type DateStr = string;

export function todayStr(): DateStr {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function toDate(date: DateStr): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: DateStr, days: number): DateStr {
  const dt = toDate(date);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate(),
  ).padStart(2, "0")}`;
}

/** Días entre dos fechas (b - a). Puede ser negativo. */
export function daysBetween(a: DateStr, b: DateStr): number {
  const ms = toDate(b).getTime() - toDate(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function dateLabel(date: DateStr): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

/** Equivalente mensual "de bolsillo" de una TNA (sin capitalizar): TNA/12. */
export function tnaToMonthlyPct(tna: number): number {
  return tna / 12;
}

export type PfMovementLike = {
  date: DateStr;
  amount: number;
};

export type PlazoFijoResult = {
  /** Capital presente al final (inicial + depósitos - retiros, sin intereses). */
  finalBalance: number;
  /** Interés total ganado, prorrateado por el saldo realmente presente en cada tramo. */
  totalInterest: number;
  /** finalBalance + totalInterest: el monto real al vencimiento (o a `endDate`). */
  finalAmount: number;
};

/**
 * Calcula el resultado real de un plazo fijo cuando el capital puede
 * cambiar en cualquier momento del plazo (depósitos/retiros con fecha).
 * Interés simple por tramo: cada tramo entre movimientos gana
 * `saldo * TNA/100 * días/365` sobre el saldo vigente en ese tramo; el
 * interés no capitaliza durante el plazo (se paga recién al final, como en
 * un plazo fijo tradicional). Sin movimientos, da lo mismo que el interés
 * simple de siempre: `principal * (1 + TNA/100 * días/365)`.
 */
export function computePlazoFijoResult(
  principal: number,
  tna: number,
  startDate: DateStr,
  endDate: DateStr,
  movements: PfMovementLike[],
): PlazoFijoResult {
  const sorted = [...movements]
    .filter((m) => m.date >= startDate && m.date <= endDate)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let balance = principal;
  let totalInterest = 0;
  let cursor = startDate;

  for (const m of sorted) {
    const days = daysBetween(cursor, m.date);
    totalInterest += balance * (tna / 100) * (days / 365);
    balance += m.amount;
    cursor = m.date;
  }

  const lastDays = daysBetween(cursor, endDate);
  totalInterest += balance * (tna / 100) * (lastDays / 365);

  return {
    finalBalance: balance,
    totalInterest,
    finalAmount: balance + totalInterest,
  };
}

/**
 * true si en algún punto el saldo (capital, sin contar intereses todavía no
 * pagados) queda negativo: un retiro no puede sacar más de lo que hay.
 */
export function hasNegativeBalance(
  principal: number,
  startDate: DateStr,
  endDate: DateStr,
  movements: PfMovementLike[],
): boolean {
  const sorted = [...movements]
    .filter((m) => m.date >= startDate && m.date <= endDate)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let balance = principal;
  for (const m of sorted) {
    balance += m.amount;
    if (balance < 0) return true;
  }
  return false;
}
