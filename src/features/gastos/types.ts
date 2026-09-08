import type { Currency } from "@/lib/money";
import type { ExpenseCategory } from "@/models/gastos";
import type { Period } from "@/lib/period";

export type { Currency, ExpenseCategory, Period };

export type CardDTO = {
  id: string;
  name: string;
  closingDay: number | null;
  dueDay: number | null;
  color: string | null;
  archived: boolean;
};

export type ExpenseDTO = {
  id: string;
  period: Period;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: Currency;
  cardId: string | null;
  cardName: string | null;
  paid: boolean;
  note: string | null;
  source: "manual" | "installment" | "fixed";
  groupId: string | null;
  installment: { current: number; total: number } | null;
  fixedId: string | null;
};

export type FixedExpenseDTO = {
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  category: "fijo" | "prestamo";
  cardId: string | null;
  cardName: string | null;
  startPeriod: Period;
  endPeriod: Period | null;
  active: boolean;
};

export type CategoryTotals = Record<
  ExpenseCategory,
  { ARS: number; USD: number }
>;

export type MonthSummary = {
  byCategory: CategoryTotals;
  total: { ARS: number; USD: number };
  paid: { ARS: number; USD: number };
  pending: { ARS: number; USD: number };
};

export type MonthData = {
  period: Period;
  expenses: ExpenseDTO[];
  cards: CardDTO[];
  summary: MonthSummary;
  /** Cantidad de gastos fijos activos sin materializar en este período. */
  pendingFixedCount: number;
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  tarjeta: "Tarjetas",
  prestamo: "Préstamos",
  fijo: "Gastos fijos",
  previsto: "Previstos",
};

export const CATEGORY_ORDER: ExpenseCategory[] = [
  "tarjeta",
  "prestamo",
  "fijo",
  "previsto",
];

export type ActionResult = { ok: true } | { ok: false; error: string };
