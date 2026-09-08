"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Card, Expense, FixedExpense, OWNER_ID } from "@/models/gastos";
import { addMonths, isValidPeriod } from "@/lib/period";
import type { ActionResult } from "./types";

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
const amount = z.coerce.number().positive("El monto debe ser mayor a 0.");
const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Id inválido")
  .optional()
  .or(z.literal("").transform(() => undefined));

const expenseInput = z.object({
  period,
  category: z.enum(["tarjeta", "prestamo", "fijo", "previsto"]),
  description: z.string().trim().min(1, "Falta la descripción."),
  amount,
  currency,
  cardId: objectId,
  note: z.string().trim().optional(),
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
});

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
    await Expense.updateOne({ _id: id, userId: OWNER_ID }, { $set: data });
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
  input: z.input<typeof fixedInput>,
): Promise<ActionResult> {
  return run(async () => {
    const data = fixedInput.parse(input);
    await FixedExpense.create({ userId: OWNER_ID, ...data });
  });
}

export async function updateFixedExpense(
  id: string,
  input: z.input<typeof fixedInput>,
): Promise<ActionResult> {
  return run(async () => {
    const data = fixedInput.parse(input);
    await FixedExpense.updateOne(
      { _id: id, userId: OWNER_ID },
      { $set: { ...data, endPeriod: data.endPeriod ?? null } },
    );
  });
}

export async function deleteFixedExpense(id: string): Promise<ActionResult> {
  return run(async () => {
    await FixedExpense.deleteOne({ _id: id, userId: OWNER_ID });
  });
}

/** Crea los gastos del mes a partir de las plantillas de gastos fijos activas. */
export async function generateFixedForPeriod(
  targetPeriod: string,
): Promise<ActionResult> {
  return run(async () => {
    const p = period.parse(targetPeriod);
    const templates = await FixedExpense.find({
      userId: OWNER_ID,
      active: true,
      startPeriod: { $lte: p },
    }).lean();

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
        return (!end || p <= end) && !done.has(String(t._id));
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
