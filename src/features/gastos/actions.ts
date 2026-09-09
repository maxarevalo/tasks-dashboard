"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Card, Expense, FixedExpense, OWNER_ID } from "@/models/gastos";
import { addMonths, currentPeriod as currentPeriodValue, isValidPeriod } from "@/lib/period";
import type { ActionResult, DupStatus } from "./types";

const GASTOS_PATH = "/personal/gastos";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
}

function revalidate() {
  revalidatePath(GASTOS_PATH, "layout");
}

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await requireSession();
    await connectToDatabase();
    await fn();
    revalidate();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues[0]?.message : (e as Error).message;
    return fail(msg ?? "Error inesperado.");
  }
}

/* ------------------------------- Schemas ------------------------------- */

const period = z.string().refine(isValidPeriod, "Período inválido (YYYY-MM).");
const currency = z.enum(["ARS", "USD"]);
// Cuotas y fijos: siempre positivo.
const amount = z.coerce.number().positive("El monto debe ser mayor a 0.");
// Gastos sueltos: admite negativo (reintegros), no cero.
const signedAmount = z.coerce
  .number()
  .refine((n) => Number.isFinite(n) && n !== 0, "El monto no puede ser 0.");
const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Id inválido")
  .optional()
  .or(z.literal("").transform(() => undefined));

const expenseInput = z.object({
  period,
  category: z.enum(["tarjeta", "prestamo", "fijo", "previsto"]),
  description: z.string().trim().min(1, "Falta la descripción."),
  amount: signedAmount,
  currency,
  cardId: objectId,
  note: z.string().trim().optional(),
  paid: z.boolean().optional(),
});

const bulkExpenseInput = z.object({
  period,
  category: z.enum(["tarjeta", "prestamo", "fijo", "previsto"]),
  description: z.string().trim().min(1),
  amount: signedAmount,
  currency,
  cardId: objectId,
  paid: z.boolean().optional(),
});

const installmentInput = z.object({
  description: z.string().trim().min(1, "Falta la descripción."),
  amountPerInstallment: amount,
  currency,
  category: z.enum(["tarjeta", "prestamo"]),
  cardId: objectId,
  startPeriod: period,
  current: z.coerce.number().int().min(1, "Cuota inicial inválida."),
  total: z.coerce.number().int().min(1).max(120, "Máximo 120 cuotas."),
});

const dayOfMonth = z.coerce.number().int().min(1).max(31).optional();

const cardInput = z.object({
  name: z.string().trim().min(1, "Falta el nombre."),
  closingDay: dayOfMonth,
  dueDay: dayOfMonth,
  color: z.string().trim().optional(),
});

const fixedInput = z.object({
  description: z.string().trim().min(1, "Falta la descripción."),
  amount,
  currency,
  category: z.enum(["fijo", "prestamo"]).default("fijo"),
  cardId: objectId,
  startPeriod: period,
  endPeriod: period.optional().or(z.literal("").transform(() => undefined)),
  active: z.boolean().optional(),
  autoGenerate: z.boolean().optional(),
});

const createFixedInput = fixedInput.extend({
  /** Materializa el gasto en el rango [applyFrom .. horizonte] al crearlo. */
  applyFrom: period.optional().or(z.literal("").transform(() => undefined)),
});

/** Meses hacia adelante que se materializan de una para gastos automáticos. */
const AUTO_FIXED_HORIZON = 24;

type FixedTemplateLike = {
  _id: unknown;
  description: string;
  amount: number;
  currency: string;
  category?: string;
  cardId?: unknown;
  startPeriod: string;
  endPeriod?: string | null;
  skipPeriods?: string[];
};

/**
 * Sincroniza las filas de Expense de una plantilla en [from..to]:
 * crea las que faltan y, si `updateExisting`, pisa las que no estén pagadas
 * ni editadas a mano con los valores actuales de la plantilla.
 */
async function materializeFixedRange(
  template: FixedTemplateLike,
  from: string,
  to: string,
  {
    updateExisting = false,
    createMissing = true,
  }: { updateExisting?: boolean; createMissing?: boolean } = {},
): Promise<void> {
  const start = from > template.startPeriod ? from : template.startPeriod;
  const end =
    template.endPeriod && template.endPeriod < to ? template.endPeriod : to;
  if (start > end) return;

  const skip = new Set(template.skipPeriods ?? []);
  const periods: string[] = [];
  for (let p = start; p <= end; p = addMonths(p, 1)) {
    if (!skip.has(p)) periods.push(p);
  }
  if (periods.length === 0) return;

  const values = {
    category: template.category ?? "fijo",
    description: template.description,
    amount: template.amount,
    currency: template.currency,
    cardId: template.cardId ?? undefined,
  };

  const existing = await Expense.find({
    userId: OWNER_ID,
    fixedId: template._id,
    period: { $in: periods },
  })
    .select("period")
    .lean();
  const done = new Set(existing.map((e) => String(e.period)));

  if (createMissing) {
    const rows = periods
      .filter((p) => !done.has(p))
      .map((p) => ({
        userId: OWNER_ID,
        period: p,
        ...values,
        source: "fixed" as const,
        fixedId: template._id,
      }));

    if (rows.length) {
      await Expense.insertMany(rows, { ordered: false }).catch((e) => {
        if ((e as { code?: number }).code !== 11000) throw e;
      });
    }
  }

  if (updateExisting) {
    await Expense.updateMany(
      {
        userId: OWNER_ID,
        fixedId: template._id,
        period: { $in: periods },
        paid: { $ne: true },
        overridden: { $ne: true },
      },
      { $set: values },
    );
  }
}

/* ------------------------------ Expenses ------------------------------- */

export async function createExpense(
  input: z.input<typeof expenseInput>,
): Promise<ActionResult> {
  return run(async () => {
    const data = expenseInput.parse(input);
    await Expense.create({
      userId: OWNER_ID,
      ...data,
      cardId: data.category === "tarjeta" ? data.cardId : undefined,
      source: "manual",
      paidAt: data.paid ? new Date() : undefined,
    });
  });
}

export async function createExpensesBulk(
  items: z.input<typeof bulkExpenseInput>[],
): Promise<ActionResult> {
  return run(async () => {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("No hay items para importar.");
    }
    if (items.length > 300) {
      throw new Error("Máximo 300 items por importación.");
    }
    const rows = items.map((raw) => {
      const data = bulkExpenseInput.parse(raw);
      return {
        userId: OWNER_ID,
        period: data.period,
        category: data.category,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        cardId: data.category === "tarjeta" ? data.cardId : undefined,
        source: "manual" as const,
        paid: data.paid ?? false,
        paidAt: data.paid ? new Date() : undefined,
      };
    });
    await Expense.insertMany(rows);
  });
}

/**
 * Para el paso de revisión de la importación: por cada item devuelve si ya
 * existe un gasto con la misma descripción (sameName) y/o mismo monto (exact)
 * en el mismo mes.
 */
export async function checkBulkDuplicates(
  probes: { description: string; period: string; amount: number }[],
): Promise<DupStatus[]> {
  try {
    await requireSession();
    await connectToDatabase();
    if (!Array.isArray(probes) || probes.length === 0) return [];

    const norm = (s: string) => s.trim().toLowerCase();
    const periods = [
      ...new Set(probes.map((p) => p.period).filter(isValidPeriod)),
    ];
    const existing = await Expense.find({
      userId: OWNER_ID,
      period: { $in: periods },
    })
      .select("description amount period")
      .lean();

    const byKey = new Map<string, number[]>();
    for (const e of existing) {
      const k = `${e.period}|${norm(String(e.description))}`;
      const arr = byKey.get(k) ?? [];
      arr.push(Number(e.amount));
      byKey.set(k, arr);
    }

    return probes.map((p) => {
      const amounts = byKey.get(`${p.period}|${norm(p.description ?? "")}`);
      if (!amounts) return { exact: false, sameName: false };
      return {
        sameName: true,
        exact: amounts.some((a) => Math.abs(a - p.amount) < 0.005),
      };
    });
  } catch {
    return probes.map(() => ({ exact: false, sameName: false }));
  }
}

export async function createInstallmentPurchase(
  input: z.input<typeof installmentInput>,
): Promise<ActionResult> {
  return run(async () => {
    const data = installmentInput.parse(input);
    if (data.current > data.total) {
      throw new Error("La cuota inicial no puede ser mayor al total.");
    }
    const remaining = data.total - data.current + 1;
    const groupId = randomUUID();
    const rows = Array.from({ length: remaining }, (_, k) => ({
      userId: OWNER_ID,
      period: addMonths(data.startPeriod, k),
      category: data.category,
      description: data.description,
      amount: data.amountPerInstallment,
      currency: data.currency,
      cardId: data.category === "tarjeta" ? data.cardId : undefined,
      source: "installment" as const,
      groupId,
      installment: { current: data.current + k, total: data.total },
    }));
    await Expense.insertMany(rows);
  });
}

export async function updateExpense(
  id: string,
  patch: Partial<z.input<typeof expenseInput>>,
): Promise<ActionResult> {
  return run(async () => {
    const data = expenseInput.partial().parse(patch);
    const row = await Expense.findOne({ _id: id, userId: OWNER_ID })
      .select("source")
      .lean();
    // Un gasto fijo editado a mano queda "fijado": no se pisa al propagar
    // cambios desde la plantilla.
    const extra =
      (row as { source?: string } | null)?.source === "fixed"
        ? { overridden: true }
        : {};
    await Expense.updateOne(
      { _id: id, userId: OWNER_ID },
      { $set: { ...data, ...extra } },
    );
  });
}

/** Quita un gasto fijo de un mes puntual (no se vuelve a generar en ese mes). */
export async function skipFixedForPeriod(
  expenseId: string,
): Promise<ActionResult> {
  return run(async () => {
    const row = await Expense.findOne({ _id: expenseId, userId: OWNER_ID })
      .select("source fixedId period")
      .lean();
    const doc = row as
      | { source?: string; fixedId?: unknown; period?: string }
      | null;
    if (!doc?.fixedId || doc.source !== "fixed") {
      throw new Error("Ese gasto no viene de una plantilla de gasto fijo.");
    }
    await FixedExpense.updateOne(
      { _id: doc.fixedId, userId: OWNER_ID },
      { $addToSet: { skipPeriods: doc.period } },
    );
    await Expense.deleteOne({ _id: expenseId, userId: OWNER_ID });
  });
}

/** Vuelve a incluir un gasto fijo en un mes que había sido quitado. */
export async function restoreFixedForPeriod(
  fixedId: string,
  targetPeriod: string,
): Promise<ActionResult> {
  return run(async () => {
    const p = period.parse(targetPeriod);
    await FixedExpense.updateOne(
      { _id: fixedId, userId: OWNER_ID },
      { $pull: { skipPeriods: p } },
    );
    const t = await FixedExpense.findOne({
      _id: fixedId,
      userId: OWNER_ID,
    }).lean();
    if (t) {
      await materializeFixedRange(t as unknown as FixedTemplateLike, p, p);
    }
  });
}

export async function setExpensePaid(
  id: string,
  paid: boolean,
): Promise<ActionResult> {
  return run(async () => {
    await Expense.updateOne(
      { _id: id, userId: OWNER_ID },
      { $set: { paid, paidAt: paid ? new Date() : null } },
    );
  });
}

export async function deleteExpense(
  id: string,
  scope: "one" | "group-future" | "group-all" = "one",
): Promise<ActionResult> {
  return run(async () => {
    const doc = await Expense.findOne({ _id: id, userId: OWNER_ID }).lean();
    if (!doc) throw new Error("No se encontró el gasto.");
    const groupId = (doc as { groupId?: string }).groupId;

    if (scope === "one" || !groupId) {
      await Expense.deleteOne({ _id: id, userId: OWNER_ID });
      return;
    }
    const filter: Record<string, unknown> = { userId: OWNER_ID, groupId };
    if (scope === "group-future") {
      filter.period = { $gte: (doc as { period: string }).period };
    }
    await Expense.deleteMany(filter);
  });
}

/* -------------------------------- Cards -------------------------------- */

export async function createCard(
  input: z.input<typeof cardInput>,
): Promise<ActionResult> {
  return run(async () => {
    const data = cardInput.parse(input);
    await Card.create({ userId: OWNER_ID, ...data });
  });
}

export async function updateCard(
  id: string,
  input: z.input<typeof cardInput>,
): Promise<ActionResult> {
  return run(async () => {
    const data = cardInput.parse(input);
    await Card.updateOne({ _id: id, userId: OWNER_ID }, { $set: data });
  });
}

export async function setCardArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  return run(async () => {
    await Card.updateOne({ _id: id, userId: OWNER_ID }, { $set: { archived } });
  });
}

/* ---------------------------- Fixed expenses --------------------------- */

export async function createFixedExpense(
  input: z.input<typeof createFixedInput>,
): Promise<ActionResult> {
  return run(async () => {
    const { applyFrom, ...data } = createFixedInput.parse(input);
    const doc = await FixedExpense.create({ userId: OWNER_ID, ...data });

    if (applyFrom) {
      await materializeFixedRange(
        doc.toObject() as unknown as FixedTemplateLike,
        applyFrom,
        addMonths(applyFrom, AUTO_FIXED_HORIZON),
      );
    }
  });
}

export async function updateFixedExpense(
  id: string,
  input: z.input<typeof createFixedInput>,
): Promise<ActionResult> {
  return run(async () => {
    const { applyFrom, ...data } = createFixedInput.parse(input);

    const update: Record<string, unknown> = {
      $set: { ...data, endPeriod: data.endPeriod ?? null },
    };
    if (applyFrom) {
      // Re-afirmar la vigencia desde `applyFrom`: destildar los meses salteados
      // de ahí en adelante para que se vuelvan a generar.
      update.$pull = { skipPeriods: { $gte: applyFrom } };
    }
    await FixedExpense.updateOne({ _id: id, userId: OWNER_ID }, update);

    if (applyFrom) {
      const doc = await FixedExpense.findOne({
        _id: id,
        userId: OWNER_ID,
      }).lean();
      if (doc) {
        await materializeFixedRange(
          doc as unknown as FixedTemplateLike,
          applyFrom,
          addMonths(applyFrom, AUTO_FIXED_HORIZON),
          {
            updateExisting: true,
            createMissing: Boolean((doc as { autoGenerate?: boolean }).autoGenerate),
          },
        );
      }
    }
  });
}

export async function deleteFixedExpense(id: string): Promise<ActionResult> {
  return run(async () => {
    await FixedExpense.deleteOne({ _id: id, userId: OWNER_ID });
    // Limpia las ocurrencias futuras no pagadas; deja el historial intacto.
    await Expense.deleteMany({
      userId: OWNER_ID,
      fixedId: id,
      paid: { $ne: true },
      period: { $gte: currentPeriodValue() },
    });
  });
}

/** Crea los gastos del mes a partir de las plantillas de gastos fijos activas. */
export async function generateFixedForPeriod(
  targetPeriod: string,
  onlyAuto = false,
): Promise<ActionResult> {
  return run(async () => {
    const p = period.parse(targetPeriod);
    const templateFilter: Record<string, unknown> = {
      userId: OWNER_ID,
      active: true,
      startPeriod: { $lte: p },
    };
    if (onlyAuto) templateFilter.autoGenerate = true;
    const templates = await FixedExpense.find(templateFilter).lean();

    const existing = await Expense.find({
      userId: OWNER_ID,
      period: p,
      fixedId: { $exists: true },
    })
      .select("fixedId")
      .lean();
    const done = new Set(existing.map((e) => String(e.fixedId)));

    const rows = templates
      .filter((t) => {
        const end = (t.endPeriod as string) ?? null;
        const skipped =
          Array.isArray(t.skipPeriods) && t.skipPeriods.includes(p);
        return (!end || p <= end) && !skipped && !done.has(String(t._id));
      })
      .map((t) => ({
        userId: OWNER_ID,
        period: p,
        category: (t.category as string) ?? "fijo",
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        cardId: t.cardId ?? undefined,
        source: "fixed" as const,
        fixedId: t._id,
      }));

    if (rows.length) {
      await Expense.insertMany(rows, { ordered: false }).catch((e) => {
        // Ignora choques con el índice único (fixedId, period).
        if ((e as { code?: number }).code !== 11000) throw e;
      });
    }
  });
}
