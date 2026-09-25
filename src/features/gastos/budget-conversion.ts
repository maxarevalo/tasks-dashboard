import "server-only";
import { Budget, Expense } from "@/models/gastos";
import type { Currency } from "@/lib/money";
import type { Period } from "@/lib/period";
import type { ExpenseTag } from "@/lib/tags";

/**
 * Un gasto "Previsto" con etiqueta no se guarda como gasto: se suma al
 * presupuesto por etiqueta de ese mes/moneda (ver Budget en src/models/gastos.ts),
 * que se va descontando con los gastos reales de esa etiqueta. Los previstos
 * sin etiqueta (o con monto negativo) siguen siendo gastos comunes.
 */
export function isBudgetPrevisto(e: {
  category?: string | null;
  tag?: string | null;
  amount?: number | null;
}): boolean {
  return e.category === "previsto" && !!e.tag && (e.amount ?? 0) > 0;
}

/** Suma `amount` al presupuesto de la etiqueta (lo crea si no existe). */
export async function addToBudget(
  uid: string,
  period: Period,
  tag: ExpenseTag,
  currency: Currency,
  amount: number,
): Promise<void> {
  await Budget.updateOne(
    { userId: uid, period, tag, currency },
    { $inc: { amount } },
    { upsert: true },
  );
}

/**
 * Convierte en presupuestos los gastos "Previsto" con etiqueta que haya
 * (todos los meses, o solo `ids` si se pasa). Cada gasto se borra antes de
 * sumarse al presupuesto, así dos conversiones simultáneas no lo cuentan
 * dos veces.
 */
export async function convertTaggedPrevistos(
  uid: string,
  ids?: string[],
): Promise<number> {
  const filter: Record<string, unknown> = {
    userId: uid,
    category: "previsto",
    tag: { $ne: null },
    amount: { $gt: 0 },
  };
  if (ids) filter._id = { $in: ids };

  const candidates = await Expense.find(filter).select("_id").lean();
  let converted = 0;
  for (const c of candidates) {
    const doc = await Expense.findOneAndDelete({ ...filter, _id: c._id }).lean();
    if (!doc) continue;
    await addToBudget(
      uid,
      String(doc.period),
      doc.tag as ExpenseTag,
      doc.currency as Currency,
      (doc.amount as number) ?? 0,
    );
    converted++;
  }
  return converted;
}
