import type { Currency } from "@/lib/money";
import type { ExpenseCategory, FixedFrequency } from "@/models/gastos";
import type { Period } from "@/lib/period";
import type { ExpenseTag } from "@/lib/tags";

export type { Currency, ExpenseCategory, Period, FixedFrequency, ExpenseTag };

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
  /** Ya existe un gasto equivalente (misma categoría/descripción/tarjeta) el mes que viene. */
  replicatedNextMonth: boolean;
  /** Etiqueta libre opcional (ver EXPENSE_TAGS en src/lib/tags.ts). */
  tag: ExpenseTag | null;
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
  /** "monthly" = todos los meses; "annual" = una vez por año, en el mes de startPeriod. */
  frequency: FixedFrequency;
  autoGenerate: boolean;
  skipPeriods: Period[];
  /** Etiqueta libre opcional (ver EXPENSE_TAGS en src/lib/tags.ts). */
  tag: ExpenseTag | null;
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
  frequency: FixedFrequency;
};

export type BudgetDTO = {
  id: string;
  period: Period;
  tag: ExpenseTag;
  currency: Currency;
  /** Monto previsto. */
  amount: number;
  /** Calculado: suma de todos los gastos del mes con esta etiqueta y moneda (cualquier categoría). */
  spent: number;
  /** Calculado: amount - spent. */
  remaining: number;
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
  /** Presupuestos previstos por etiqueta para este mes. */
  budgets: BudgetDTO[];
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

/* ------------------------- Tabla mensual (matriz) ---------------------- */

export type MatrixCell = { amount: number; estimated: boolean };

export type MatrixRow = {
  key: string;
  category: ExpenseCategory;
  description: string;
  cardName: string | null;
  cells: Record<Period, MatrixCell>;
  total: number;
};

export type MatrixGroup = {
  category: ExpenseCategory;
  rows: MatrixRow[];
  subtotals: Record<Period, number>;
  total: number;
};

export type ExpenseMatrix = {
  periods: Period[];
  /** Moneda de visualización (en la unificada, la elegida para convertir). */
  currency: Currency;
  /** true si esta matriz combina ARS + USD convertidos a `currency`. */
  unified: boolean;
  groups: MatrixGroup[];
  columnTotals: Record<Period, number>;
  grandTotal: number;
  /** true si hay gastos en la otra moneda (para ofrecer el toggle). */
  hasOtherCurrency: boolean;
};
