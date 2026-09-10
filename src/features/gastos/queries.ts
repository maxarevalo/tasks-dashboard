import "server-only";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import {
  Card,
  Expense,
  FixedExpense,
  EXPENSE_CATEGORIES,
} from "@/models/gastos";
import { addMonths, periodInRange, type Period } from "@/lib/period";
import type { Currency } from "@/lib/money";
import {
  CATEGORY_ORDER,
  type CardDTO,
  type ExpenseDTO,
  type ExpenseCategory,
  type ExpenseMatrix,
  type FixedExpenseDTO,
  type MatrixCell,
  type MatrixRow,
  type MonthData,
  type MonthSummary,
} from "./types";

type Lean = Record<string, unknown>;

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function mapCard(doc: Lean): CardDTO {
  return {
    id: str(doc._id),
    name: str(doc.name),
    closingDay: (doc.closingDay as number) ?? null,
    dueDay: (doc.dueDay as number) ?? null,
    color: (doc.color as string) ?? null,
    archived: Boolean(doc.archived),
  };
}

function mapExpense(
  doc: Lean,
  cardName: string | null,
  fixedStatus: ExpenseDTO["fixedStatus"] = null,
): ExpenseDTO {
  const inst = doc.installment as
    | { current?: number; total?: number }
    | undefined;
  return {
    id: str(doc._id),
    period: str(doc.period),
    category: doc.category as ExpenseDTO["category"],
    description: str(doc.description),
    amount: (doc.amount as number) ?? 0,
    currency: doc.currency as ExpenseDTO["currency"],
    cardId: doc.cardId ? str(doc.cardId) : null,
    cardName,
    paid: Boolean(doc.paid),
    note: (doc.note as string) ?? null,
    source: (doc.source as ExpenseDTO["source"]) ?? "manual",
    groupId: (doc.groupId as string) ?? null,
    installment:
      inst && inst.total
        ? { current: inst.current ?? 1, total: inst.total }
        : null,
    fixedId: doc.fixedId ? str(doc.fixedId) : null,
    overridden: Boolean(doc.overridden),
    fixedStatus,
  };
}

function mapFixed(doc: Lean, cardName: string | null): FixedExpenseDTO {
  return {
    id: str(doc._id),
    description: str(doc.description),
    amount: (doc.amount as number) ?? 0,
    currency: doc.currency as FixedExpenseDTO["currency"],
    category: (doc.category as FixedExpenseDTO["category"]) ?? "fijo",
    cardId: doc.cardId ? str(doc.cardId) : null,
    cardName,
    startPeriod: str(doc.startPeriod),
    endPeriod: (doc.endPeriod as string) ?? null,
    active: Boolean(doc.active),
    autoGenerate: Boolean(doc.autoGenerate),
    skipPeriods: Array.isArray(doc.skipPeriods)
      ? (doc.skipPeriods as string[])
      : [],
  };
}

function buildSummary(expenses: ExpenseDTO[]): MonthSummary {
  const byCategory = Object.fromEntries(
    EXPENSE_CATEGORIES.map((c) => [c, { ARS: 0, USD: 0 }]),
  ) as MonthSummary["byCategory"];
  const total = { ARS: 0, USD: 0 };
  const paid = { ARS: 0, USD: 0 };
  const pending = { ARS: 0, USD: 0 };

  for (const e of expenses) {
    byCategory[e.category][e.currency] += e.amount;
    total[e.currency] += e.amount;
    (e.paid ? paid : pending)[e.currency] += e.amount;
  }

  return { byCategory, total, paid, pending };
}

export async function getCards(includeArchived = false): Promise<CardDTO[]> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();
  const filter: Record<string, unknown> = { userId: uid };
  if (!includeArchived) filter.archived = { $ne: true };
  const docs = await Card.find(filter).sort({ name: 1 }).lean();
  return docs.map(mapCard);
}

export async function getFixedExpenses(): Promise<FixedExpenseDTO[]> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();
  const [docs, cards] = await Promise.all([
    FixedExpense.find({ userId: uid }).sort({ active: -1, description: 1 }).lean(),
    getCards(true),
  ]);
  const cardName = new Map(cards.map((c) => [c.id, c.name]));
  return docs.map((d) =>
    mapFixed(d as Lean, d.cardId ? (cardName.get(String(d.cardId)) ?? null) : null),
  );
}

/**
 * Total de gastos por mes y moneda, para la proyección del módulo contable.
 * Incluye lo materializado + las plantillas de gastos fijos activas que
 * todavía no se cargaron en ese mes (así la proyección contempla los fijos).
 */
export async function getProjectedExpenseTotals(
  periods: Period[],
): Promise<Record<Period, { ARS: number; USD: number }>> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();

  const result: Record<Period, { ARS: number; USD: number }> = {};
  for (const p of periods) result[p] = { ARS: 0, USD: 0 };
  if (periods.length === 0) return result;

  const [expenseDocs, fixedDocs] = await Promise.all([
    Expense.find({ userId: uid, period: { $in: periods } })
      .select("period amount currency fixedId")
      .lean(),
    FixedExpense.find({ userId: uid, active: true })
      .select("amount currency startPeriod endPeriod skipPeriods")
      .lean(),
  ]);

  const materialized = new Set<string>(); // `${period}|${fixedId}`
  for (const e of expenseDocs) {
    const p = String(e.period);
    if (!result[p]) continue;
    const cur = (e.currency as "ARS" | "USD") ?? "ARS";
    result[p][cur] += (e.amount as number) ?? 0;
    if (e.fixedId) materialized.add(`${p}|${String(e.fixedId)}`);
  }

  for (const p of periods) {
    for (const f of fixedDocs) {
      const start = String(f.startPeriod);
      const end = (f.endPeriod as string) ?? null;
      const skips = Array.isArray(f.skipPeriods)
        ? (f.skipPeriods as string[])
        : [];
      if (p < start || (end && p > end) || skips.includes(p)) continue;
      if (materialized.has(`${p}|${String(f._id)}`)) continue;
      const cur = (f.currency as "ARS" | "USD") ?? "ARS";
      result[p][cur] += (f.amount as number) ?? 0;
    }
  }

  return result;
}

/**
 * Matriz de gastos: filas = gasto (por categoría + descripción + tarjeta),
 * columnas = meses del rango. Incluye los gastos fijos activos como celdas
 * "estimadas" en los meses donde todavía no se materializaron.
 */
export async function getExpenseMatrix(
  periods: Period[],
  currency: Currency,
): Promise<ExpenseMatrix> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();

  const empty: ExpenseMatrix = {
    periods,
    currency,
    groups: [],
    columnTotals: Object.fromEntries(periods.map((p) => [p, 0])),
    grandTotal: 0,
    hasOtherCurrency: false,
  };
  if (periods.length === 0) return empty;

  const other: Currency = currency === "ARS" ? "USD" : "ARS";
  const [expenseDocs, otherCount, cards, fixedDocs] = await Promise.all([
    Expense.find({ userId: uid, period: { $in: periods }, currency })
      .select("period amount category description cardId fixedId")
      .lean(),
    Expense.countDocuments({
      userId: uid,
      period: { $in: periods },
      currency: other,
    }),
    getCards(true),
    FixedExpense.find({ userId: uid, active: true, currency })
      .select(
        "description category cardId amount startPeriod endPeriod skipPeriods",
      )
      .lean(),
  ]);

  const cardNameById = new Map(cards.map((c) => [c.id, c.name]));
  const periodSet = new Set(periods);

  type MutableRow = MatrixRow & { cells: Record<Period, MatrixCell> };
  const rowMap = new Map<string, MutableRow>();

  const rowFor = (
    category: ExpenseCategory,
    description: string,
    cardId: string | null,
  ): MutableRow => {
    const key = `${category}|${description.trim().toLowerCase()}|${cardId ?? ""}`;
    let row = rowMap.get(key);
    if (!row) {
      row = {
        key,
        category,
        description: description.trim(),
        cardName: cardId ? (cardNameById.get(cardId) ?? null) : null,
        cells: {},
        total: 0,
      };
      rowMap.set(key, row);
    }
    return row;
  };

  const materialized = new Set<string>(); // `${period}|${fixedId}`

  for (const e of expenseDocs) {
    const p = String(e.period);
    if (!periodSet.has(p)) continue;
    const cardId = e.cardId ? String(e.cardId) : null;
    const row = rowFor(
      e.category as ExpenseCategory,
      String(e.description),
      cardId,
    );
    const amount = (e.amount as number) ?? 0;
    const cell = row.cells[p] ?? { amount: 0, estimated: false };
    cell.amount += amount;
    row.cells[p] = cell;
    row.total += amount;
    if (e.fixedId) materialized.add(`${p}|${String(e.fixedId)}`);
  }

  // Gastos fijos activos -> celdas "estimadas" en los meses sin materializar.
  for (const f of fixedDocs) {
    const skips = Array.isArray(f.skipPeriods)
      ? (f.skipPeriods as string[])
      : [];
    const cardId = f.cardId ? String(f.cardId) : null;
    const amount = (f.amount as number) ?? 0;
    for (const p of periods) {
      if (
        !periodInRange(p, String(f.startPeriod), (f.endPeriod as string) ?? null)
      )
        continue;
      if (skips.includes(p)) continue;
      if (materialized.has(`${p}|${String(f._id)}`)) continue;
      const row = rowFor(
        (f.category as ExpenseCategory) ?? "fijo",
        String(f.description),
        cardId,
      );
      if (row.cells[p]) continue; // ya hay algo real ahí
      row.cells[p] = { amount, estimated: true };
      row.total += amount;
    }
  }

  // Agrupar por categoría, ordenar, totalizar.
  const columnTotals: Record<Period, number> = Object.fromEntries(
    periods.map((p) => [p, 0]),
  );
  let grandTotal = 0;

  const groups = CATEGORY_ORDER.map((category) => {
    const rows = [...rowMap.values()]
      .filter((r) => r.category === category)
      .sort((a, b) => b.total - a.total);
    const subtotals: Record<Period, number> = Object.fromEntries(
      periods.map((p) => [p, 0]),
    );
    let total = 0;
    for (const r of rows) {
      for (const p of periods) {
        const v = r.cells[p]?.amount ?? 0;
        subtotals[p] += v;
        columnTotals[p] += v;
      }
      total += r.total;
    }
    grandTotal += total;
    return { category, rows, subtotals, total };
  }).filter((g) => g.rows.length > 0);

  return {
    periods,
    currency,
    groups,
    columnTotals,
    grandTotal,
    hasOtherCurrency: otherCount > 0,
  };
}

export async function getMonthData(period: Period): Promise<MonthData> {
  await connectToDatabase();
  const uid = await getActiveProfileKey();

  const nextPeriod = addMonths(period, 1);

  const [expenseDocs, cards, fixedDocs] = await Promise.all([
    Expense.find({ userId: uid, period }).sort({ createdAt: 1 }).lean(),
    getCards(true),
    FixedExpense.find({ userId: uid }).lean(),
  ]);

  const cardName = new Map(cards.map((c) => [c.id, c.name]));
  const fixedById = new Map(fixedDocs.map((f) => [String(f._id), f]));

  function fixedStatusFor(fixedId: string | null): ExpenseDTO["fixedStatus"] {
    if (!fixedId) return null;
    const t = fixedById.get(fixedId);
    if (!t) return "orphan";
    if (!t.active) return "ends";
    const end = (t.endPeriod as string) ?? null;
    if (end && nextPeriod > end) return "ends";
    const skips = Array.isArray(t.skipPeriods)
      ? (t.skipPeriods as string[])
      : [];
    if (skips.includes(nextPeriod)) return "ends";
    return "continues";
  }

  const expenses = expenseDocs.map((d) =>
    mapExpense(
      d as Lean,
      d.cardId ? (cardName.get(String(d.cardId)) ?? null) : null,
      d.source === "fixed" ? fixedStatusFor(d.fixedId ? String(d.fixedId) : null) : null,
    ),
  );

  const materializedFixedIds = new Set(
    expenses.filter((e) => e.fixedId).map((e) => e.fixedId as string),
  );
  const pending = fixedDocs.filter(
    (f) =>
      f.active &&
      periodInRange(
        period,
        String(f.startPeriod),
        (f.endPeriod as string) ?? null,
      ) &&
      !(Array.isArray(f.skipPeriods) && f.skipPeriods.includes(period)) &&
      !materializedFixedIds.has(String(f._id)),
  );

  const notContinuingNextMonth = expenses
    .filter((e) => e.fixedStatus === "ends" || e.fixedStatus === "orphan")
    .map((e) => ({
      description: e.description,
      reason: e.fixedStatus as "ends" | "orphan",
    }));

  const fixedTemplates = fixedDocs.map((d) =>
    mapFixed(
      d as Lean,
      d.cardId ? (cardName.get(String(d.cardId)) ?? null) : null,
    ),
  );

  const pendingManualFixed = pending
    .filter((f) => !f.autoGenerate)
    .map((f) => ({
      id: String(f._id),
      description: String(f.description),
      amount: (f.amount as number) ?? 0,
      currency: f.currency as MonthData["pendingManualFixed"][number]["currency"],
      category:
        (f.category as "fijo" | "prestamo") ?? "fijo",
      cardName: f.cardId
        ? (cardName.get(String(f.cardId)) ?? null)
        : null,
    }));

  return {
    period,
    expenses,
    cards: cards.filter((c) => !c.archived),
    fixedTemplates,
    summary: buildSummary(expenses),
    pendingManualFixed,
    pendingAutoFixedCount: pending.filter((f) => f.autoGenerate).length,
    notContinuingNextMonth,
  };
}
