import type { Currency } from "@/lib/money";
import type { DateStr } from "@/lib/pf";

export type { Currency, DateStr };

export type ActionResult = { ok: true } | { ok: false; error: string };

export type PfMovementDTO = {
  id: string;
  date: DateStr;
  description: string;
  /** Positivo = depósito, negativo = retiro. */
  amount: number;
};

export type PlazoFijoDTO = {
  id: string;
  description: string;
  currency: Currency;
  startDate: DateStr;
  /** Calculado: startDate + termDays. */
  endDate: DateStr;
  termDays: number;
  /** Capital con el que arrancó el plazo (sin contar movimientos). */
  principal: number;
  /** Tasa nominal anual, en porcentaje. */
  tna: number;
  /** Calculado: TNA/12. */
  monthlyPct: number;
  movements: PfMovementDTO[];
  /** Calculado: suma de `movements`. */
  movementsNet: number;
  /**
   * Calculado con interés simple prorrateado por tramo según el saldo
   * realmente presente (ver computePlazoFijoResult en src/lib/pf.ts).
   */
  maturityAmount: number;
  /** Calculado: maturityAmount - principal - movementsNet (interés real ganado). */
  earnedAmount: number;
  /** true si ya se renovó: queda de solo lectura, fuera de los totales activos. */
  renewed: boolean;
  /** Si nace de una renovación, el id del plazo anterior. */
  renewedFromId: string | null;
};

export type PfCurrencyTotals = {
  principal: number;
  movementsNet: number;
  earned: number;
  maturity: number;
};

export type PfTotals = Record<Currency, PfCurrencyTotals>;

export type PfOverview = {
  /** Plazos vigentes (no renovados todavía). */
  active: PlazoFijoDTO[];
  /** Plazos ya renovados: historial de solo lectura. */
  history: PlazoFijoDTO[];
  /** Sumado solo sobre `active` (un plazo renovado ya "vive" en su sucesor). */
  totals: PfTotals;
};
