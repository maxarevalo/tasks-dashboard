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
  /** Solo para source="fixed": fue editada a mano. */
  overridden: boolean;
  /**
   * Solo para source="fixed": qué pasa el mes siguiente.
   * - "continues": el mes que viene sigue existiendo.
   * - "ends": el mes que viene NO va a estar (fin de vigencia / salteado / pausado).
   * - "orphan": la plantilla ya no existe.
   */
  fixedStatus: "continues" | "ends" | "orphan" | null;
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
  autoGenerate: boolean;
  skipPeriods: Period[];
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

export type PendingFixedItem = {
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  category: "fijo" | "prestamo";
  cardName: string | null;
};

export type MonthData = {
  period: Period;
  expenses: ExpenseDTO[];
  cards: CardDTO[];
  /** Plantillas de gastos fijos (para editar desde un mes puntual). */
  fixedTemplates: FixedExpenseDTO[];
  summary: MonthSummary;
  /** Gastos fijos manuales sin cargar en este mes: detalle de lo que se agregaría. */
  pendingManualFixed: PendingFixedItem[];
  /** Gastos fijos automáticos sin cargar (se materializan solos). */
  pendingAutoFixedCount: number;
  /** Gastos fijos de este mes que NO continúan el mes siguiente. */
  notContinuingNextMonth: { description: string; reason: "ends" | "orphan" }[];
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

export type DupStatus = { exact: boolean; sameName: boolean };
