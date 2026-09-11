import type { Currency } from "@/lib/money";
import type { DateStr } from "@/lib/pf";

export type { Currency, DateStr };

export type ActionResult = { ok: true } | { ok: false; error: string };

export type PlazoFijoDTO = {
  id: string;
  description: string;
  currency: Currency;
  startDate: DateStr;
  /** Calculado: startDate + termDays. */
  endDate: DateStr;
  termDays: number;
  principal: number;
  /** Tasa nominal anual, en porcentaje. */
  tna: number;
  /** Calculado: TNA/12. */
  monthlyPct: number;
  /** Calculado: principal * (1 + TNA/100 * termDays/365). */
  maturityAmount: number;
  /** Calculado: maturityAmount - principal. */
  earnedAmount: number;
};

export type PfMovementDTO = {
  id: string;
  date: DateStr;
  description: string;
  currency: Currency;
  /** Positivo = ingreso, negativo = egreso. */
  amount: number;
};

export type PfCurrencyTotals = {
  principal: number;
  maturity: number;
  earned: number;
  /** Suma de movimientos (ingresos - egresos). */
  movementsNet: number;
  /** maturity + movementsNet: simula el efecto de los movimientos sobre el total. */
  simulatedMaturity: number;
};

export type PfTotals = Record<Currency, PfCurrencyTotals>;

export type PfOverview = {
  plazos: PlazoFijoDTO[];
  movements: PfMovementDTO[];
  totals: PfTotals;
};
