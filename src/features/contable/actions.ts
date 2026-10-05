"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import {
  SavingsAccount,
  Income,
  ExchangeRate,
  AccountMovement,
  IncomeReceipt,
  DOLLAR_TYPES,
  RATE_BASIS,
} from "@/models/contable";
import { applyMovement, revertMovements } from "./movements";
import { fetchDollar } from "@/lib/exchange";
import { isValidPeriod, RECURRENCE_FREQUENCIES } from "@/lib/period";
import { todayStr } from "@/lib/pf";
import type { ActionResult } from "./types";

const PATH = "/personal/estado-contable";

async function run(
  fn: (uid: string) => Promise<void>,
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("No autenticado.");
    await connectToDatabase();
    const uid = await getActiveProfileKey();
    await fn(uid);
    revalidatePath(PATH, "layout");
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof z.ZodError ? e.issues[0]?.message : (e as Error).message;
    return { ok: false, error: msg ?? "Error inesperado." };
  }
}

const period = z.string().refine(isValidPeriod, "Período inválido (YYYY-MM).");
const currency = z.enum(["ARS", "USD"]);
const optionalPeriod = period
  .optional()
  .or(z.literal("").transform(() => undefined));

/* ---------------------------- Savings accounts --------------------------- */

const returnInput = z
  .object({
    mode: z.enum(["none", "tna", "tea", "monthly", "manual"]).default("none"),
    annualRatePct: z.coerce.number().min(0).max(100000).default(0),
    monthlyRatePct: z.coerce.number().min(0).max(100000).default(0),
  })
  .default({ mode: "none", annualRatePct: 0, monthlyRatePct: 0 });

const accountInput = z.object({
  name: z.string().trim().min(1, "Falta el nombre."),
  category: z.string().trim().default(""),
  availability: z.enum(["inmediata", "corto", "inmovilizada"]).default("inmediata"),
  currency,
  balance: z.coerce.number().default(0),
  balanceAsOf: period,
  receivesNet: z.boolean().optional(),
  return: returnInput,
  manualProjections: z
    .array(z.object({ period, amount: z.coerce.number() }))
    .max(60)
    .optional()
    .default([]),
});

export async function createSavingsAccount(
  input: z.input<typeof accountInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = accountInput.parse(input);
    if (data.receivesNet) {
      await SavingsAccount.updateMany(
        { userId: uid, currency: data.currency },
        { $set: { receivesNet: false } },
      );
    }
    await SavingsAccount.create({ userId: uid, ...data });
  });
}

export async function updateSavingsAccount(
  id: string,
  input: z.input<typeof accountInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = accountInput.parse(input);
    if (data.receivesNet) {
      await SavingsAccount.updateMany(
        { userId: uid, currency: data.currency, _id: { $ne: id } },
        { $set: { receivesNet: false } },
      );
    }
    const before = await SavingsAccount.findOne({ _id: id, userId: uid })
      .select("balance")
      .lean();
    await SavingsAccount.updateOne(
      { _id: id, userId: uid },
      { $set: data },
    );
    // Un cambio de saldo hecho a mano queda en el historial como ajuste.
    const diff = data.balance - ((before?.balance as number) ?? 0);
    if (before && Math.abs(diff) >= 0.005) {
      await AccountMovement.create({
        userId: uid,
        accountId: id,
        date: todayStr(),
        amount: diff,
        kind: "ajuste",
        description: "Ajuste manual del saldo",
      });
    }
  });
}

export async function setSavingsArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult> {
  return run(async (uid) => {
    await SavingsAccount.updateOne(
      { _id: id, userId: uid },
      { $set: { archived } },
    );
  });
}

export async function deleteSavingsAccount(id: string): Promise<ActionResult> {
  return run(async (uid) => {
    await SavingsAccount.deleteOne({ _id: id, userId: uid });
    await AccountMovement.deleteMany({ userId: uid, accountId: id });
  });
}

const manualEntryInput = z.object({
  period,
  amount: z.coerce.number(),
});

export async function setManualProjection(
  id: string,
  input: z.input<typeof manualEntryInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const { period: p, amount } = manualEntryInput.parse(input);
    await SavingsAccount.updateOne(
      { _id: id, userId: uid },
      { $pull: { manualProjections: { period: p } } },
    );
    await SavingsAccount.updateOne(
      { _id: id, userId: uid },
      {
        $push: {
          manualProjections: { $each: [{ period: p, amount }], $sort: { period: 1 } },
        },
      },
    );
  });
}

export async function removeManualProjection(
  id: string,
  targetPeriod: string,
): Promise<ActionResult> {
  return run(async (uid) => {
    const p = period.parse(targetPeriod);
    await SavingsAccount.updateOne(
      { _id: id, userId: uid },
      { $pull: { manualProjections: { period: p } } },
    );
  });
}

/* -------------------------------- Income -------------------------------- */

const incomeInput = z
  .object({
    description: z.string().trim().min(1, "Falta la descripción."),
    origin: z.string().trim().default(""),
    amount: z.coerce.number().positive("El monto debe ser mayor a 0."),
    currency,
    kind: z.enum(["recurring", "oneoff"]),
    period: optionalPeriod,
    startPeriod: optionalPeriod,
    endPeriod: optionalPeriod,
    /** Solo aplica a kind="recurring": "monthly" (default), "semiannual"
     * (cada 6 meses, ej. aguinaldo) o "annual". */
    frequency: z.enum(RECURRENCE_FREQUENCIES).default("monthly"),
    confirmed: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "oneoff" && !v.period) {
      ctx.addIssue({ code: "custom", message: "Falta el mes del ingreso." });
    }
    if (v.kind === "recurring" && !v.startPeriod) {
      ctx.addIssue({ code: "custom", message: "Falta el mes de inicio." });
    }
  });

export async function createIncome(
  input: z.input<typeof incomeInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = incomeInput.parse(input);
    await Income.create({
      userId: uid,
      ...data,
      endPeriod: data.endPeriod ?? null,
    });
  });
}

export async function updateIncome(
  id: string,
  input: z.input<typeof incomeInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = incomeInput.parse(input);
    await Income.updateOne(
      { _id: id, userId: uid },
      {
        $set: {
          ...data,
          period: data.kind === "oneoff" ? data.period : null,
          startPeriod: data.kind === "recurring" ? data.startPeriod : null,
          endPeriod: data.kind === "recurring" ? (data.endPeriod ?? null) : null,
        },
      },
    );
  });
}

export async function setIncomeActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  return run(async (uid) => {
    await Income.updateOne(
      { _id: id, userId: uid },
      { $set: { active } },
    );
  });
}

export async function deleteIncome(id: string): Promise<ActionResult> {
  return run(async (uid) => {
    await Income.deleteOne({ _id: id, userId: uid });
    // Los cobros ya registrados se olvidan, pero la plata cobrada queda en las cuentas.
    await IncomeReceipt.deleteMany({ userId: uid, incomeId: id });
  });
}

/* ------------------------------ Cobros -------------------------------- */

const receiveInput = z.object({
  incomeId: z.string().regex(/^[a-f\d]{24}$/i, "Id inválido"),
  period,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  /** A qué cuenta(s) entró la plata; la suma es el monto cobrado. */
  splits: z
    .array(
      z.object({
        accountId: z.string().regex(/^[a-f\d]{24}$/i, "Elegí una cuenta."),
        amount: z.coerce.number().positive("Cada monto debe ser mayor a 0."),
      }),
    )
    .min(1, "Indicá a qué cuenta entró la plata."),
});

/**
 * Registra el cobro real de un ingreso en un mes: suma la plata a la(s)
 * cuenta(s) elegida(s) y, desde ahí, la proyección deja de sumar el ingreso
 * estimado para ese mes.
 */
export async function receiveIncome(
  input: z.input<typeof receiveInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = receiveInput.parse(input);
    const income = await Income.findOne({ _id: data.incomeId, userId: uid })
      .select("description currency")
      .lean();
    if (!income) throw new Error("No se encontró el ingreso.");
    const exists = await IncomeReceipt.exists({
      userId: uid,
      incomeId: data.incomeId,
      period: data.period,
    });
    if (exists) throw new Error("Ese ingreso ya figura cobrado en ese mes.");

    const currency = income.currency as "ARS" | "USD";
    const total = data.splits.reduce((acc, s) => acc + s.amount, 0);
    const receipt = await IncomeReceipt.create({
      userId: uid,
      incomeId: data.incomeId,
      period: data.period,
      date: data.date,
      amount: total,
      currency,
    });
    try {
      for (const s of data.splits) {
        await applyMovement(uid, {
          accountId: s.accountId,
          currency,
          date: data.date,
          amount: s.amount,
          kind: "cobro",
          description: String(income.description),
          receiptId: String(receipt._id),
        });
      }
    } catch (e) {
      // Si una cuenta no es válida, no queda un cobro a medias.
      await revertMovements(uid, { receiptId: String(receipt._id) });
      await IncomeReceipt.deleteOne({ _id: receipt._id });
      throw e;
    }
  });
}

/** Deshace un cobro: saca la plata de las cuentas y el ingreso vuelve a estar pendiente. */
export async function undoIncomeReceipt(receiptId: string): Promise<ActionResult> {
  return run(async (uid) => {
    const receipt = await IncomeReceipt.findOneAndDelete({
      _id: receiptId,
      userId: uid,
    });
    if (!receipt) return;
    await revertMovements(uid, { receiptId });
  });
}

/* ------------------------------ Cotización ---------------------------- */

const rateInput = z.object({
  mode: z.enum(["manual", "api"]),
  manualBuy: z.coerce.number().min(0).default(0),
  manualSell: z.coerce.number().min(0).default(0),
  apiType: z.enum(DOLLAR_TYPES),
  basis: z.enum(RATE_BASIS),
});

export async function setExchangeRate(
  input: z.input<typeof rateInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = rateInput.parse(input);
    await ExchangeRate.updateOne(
      { userId: uid },
      { $set: data },
      { upsert: true },
    );
    if (data.mode === "api") {
      const r = await fetchDollar(data.apiType);
      if (r) {
        await ExchangeRate.updateOne(
          { userId: uid },
          { $set: { cachedBuy: r.buy, cachedSell: r.sell, fetchedAt: new Date() } },
        );
      }
    }
  });
}

export async function refreshExchangeRate(): Promise<ActionResult> {
  return run(async (uid) => {
    const doc = await ExchangeRate.findOne({ userId: uid }).lean();
    const apiType =
      ((doc as { apiType?: string } | null)?.apiType as
        | (typeof DOLLAR_TYPES)[number]
        | undefined) ?? "blue";
    const r = await fetchDollar(apiType);
    if (!r) throw new Error("No se pudo obtener la cotización de la API.");
    await ExchangeRate.updateOne(
      { userId: uid },
      {
        $set: {
          cachedBuy: r.buy,
          cachedSell: r.sell,
          fetchedAt: new Date(),
          mode: "api",
        },
      },
      { upsert: true },
    );
  });
}
