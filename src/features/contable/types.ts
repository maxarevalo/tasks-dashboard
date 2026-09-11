import type { Currency } from "@/lib/money";
import type { Period, RecurrenceFrequency } from "@/lib/period";
import type { Availability, ReturnMode } from "@/models/contable";
import type { DollarType, RateBasis } from "@/lib/exchange";

export type {
  Currency,
  Period,
  Availability,
  ReturnMode,
  DollarType,
  RateBasis,
  RecurrenceFrequency,
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  inmediata: "Disponibilidad inmediata",
  corto: "Corto plazo",
  inmovilizada: "Inmovilizada",
};

export type SavingsAccountDTO = {
  id: string;
  name: string;
  category: string;
  availability: Availability;
  currency: Currency;
  balance: number;
  balanceAsOf: Period;
  receivesNet: boolean;
  return: {
    mode: ReturnMode;
    annualRatePct: number;
    monthlyRatePct: number;
  };
  manualProjections: { period: Period; amount: number }[];
  archived: boolean;
};

export type IncomeDTO = {
  id: string;
  description: string;
  origin: string;
  amount: number;
  currency: Currency;
  kind: "recurring" | "oneoff";
  period: Period | null;
  startPeriod: Period | null;
  endPeriod: Period | null;
  /**
   * Solo para kind="recurring": "monthly" (default), "semiannual" (cada 6
   * meses desde startPeriod, ej. aguinaldo: junio y diciembre) o "annual".
   */
  frequency: RecurrenceFrequency;
  confirmed: boolean;
  active: boolean;
};

/** Una fila de la proyección, para una moneda y un mes. */
export type ProjectionMonth = {
  period: Period;
  income: number;
  expense: number;
  net: number;
  interest: number;
  /** Saldo total acumulado al fin del mes. */
  balance: number;
};

export type CurrencyProjection = {
  currency: Currency;
  startingBalance: number;
  months: ProjectionMonth[];
};

export type ContableOverview = {
  period: Period;
  /** Ahorros totales hoy, por moneda. */
  savingsTotal: Record<Currency, number>;
  /**
   * Ahorros totales menos la suma de los montos al vencimiento de los
   * plazos fijos activos de PF Dardo (para no contar dos veces la plata que
   * ya está puesta en un plazo fijo).
   */
  savingsRealTotal: Record<Currency, number>;
  /** Ahorros por disponibilidad. */
  savingsByAvailability: Record<Availability, Record<Currency, number>>;
  /** Ahorros por categoría (para el desglose). */
  savingsByCategory: { category: string; ARS: number; USD: number }[];
  incomeThisMonth: Record<Currency, number>;
  expenseThisMonth: Record<Currency, number>;
  /** Disponible del mes = ahorros + ingresos - gastos del mes. */
  availableThisMonth: Record<Currency, number>;
};

/* ------------------------------ Cotización ---------------------------- */

export type ExchangeRateDTO = {
  mode: "manual" | "api";
  manualBuy: number;
  manualSell: number;
  apiType: DollarType;
  cachedBuy: number;
  cachedSell: number;
  fetchedAt: string | null;
  basis: RateBasis;
  /** Valores efectivos (según mode) y el usado para convertir (según basis). */
  buy: number;
  sell: number;
  value: number;
  ready: boolean;
};

/** Vista unificada: todo convertido a una sola moneda. */
export type UnifiedOverview = {
  period: Period;
  displayCurrency: Currency;
  rate: ExchangeRateDTO;
  savingsTotal: number;
  /** savingsTotal menos los montos al vencimiento de los plazos fijos activos de PF Dardo. */
  savingsRealTotal: number;
  incomeThisMonth: number;
  expenseThisMonth: number;
  availableThisMonth: number;
  /** Cuánto del total viene originalmente de cada moneda (ya convertido). */
  savingsFrom: Record<Currency, number>;
};

export type UnifiedProjection = {
  displayCurrency: Currency;
  rate: ExchangeRateDTO;
  startingBalance: number;
  months: ProjectionMonth[];
};
