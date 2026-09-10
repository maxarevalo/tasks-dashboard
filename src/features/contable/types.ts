import type { Currency } from "@/lib/money";
import type { Period } from "@/lib/period";
import type { Availability, ReturnMode } from "@/models/contable";

export type { Currency, Period, Availability, ReturnMode };

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
  /** Ahorros por disponibilidad. */
  savingsByAvailability: Record<Availability, Record<Currency, number>>;
  /** Ahorros por categoría (para el desglose). */
  savingsByCategory: { category: string; ARS: number; USD: number }[];
  incomeThisMonth: Record<Currency, number>;
  expenseThisMonth: Record<Currency, number>;
  /** Disponible del mes = ahorros + ingresos - gastos del mes. */
  availableThisMonth: Record<Currency, number>;
};
