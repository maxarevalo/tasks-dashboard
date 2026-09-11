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
  DOLLAR_TYPES,
  RATE_BASIS,
} from "@/models/contable";
import { fetchDollar } from "@/lib/exchange";
import { isValidPeriod, RECURRENCE_FREQUENCIES } from "@/lib/period";
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
    await SavingsAccount.updateOne(
      { _id: id, userId: uid },
      { $set: data },
    );
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
