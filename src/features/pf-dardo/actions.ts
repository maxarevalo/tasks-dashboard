"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { PlazoFijo } from "@/models/pf-dardo";
import { addDays, hasNegativeBalance } from "@/lib/pf";
import type { ActionResult } from "./types";

const PATH = "/personal/pf-dardo";

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

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.");
const currency = z.enum(["ARS", "USD"]);

/* ----------------------------- PlazoFijo -------------------------------- */

const plazoInput = z.object({
  description: z.string().trim().default(""),
  currency,
  startDate: dateStr,
  termDays: z.coerce.number().int().min(1, "El plazo debe ser mayor a 0."),
  principal: z.coerce.number().positive("El monto inicial debe ser mayor a 0."),
  tna: z.coerce.number().min(0, "La TNA no puede ser negativa."),
});

export async function createPlazoFijo(
  input: z.input<typeof plazoInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = plazoInput.parse(input);
    await PlazoFijo.create({ userId: uid, ...data });
  });
}

/** Solo los campos base: no toca movements/renewed/renewedFromId. */
export async function updatePlazoFijo(
  id: string,
  input: z.input<typeof plazoInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = plazoInput.parse(input);
    await PlazoFijo.updateOne({ _id: id, userId: uid }, { $set: data });
  });
}

export async function deletePlazoFijo(id: string): Promise<ActionResult> {
  return run(async (uid) => {
    await PlazoFijo.deleteOne({ _id: id, userId: uid });
  });
}

/* ------------------------------ Renovación ------------------------------ */

const renewInput = z.object({
  description: z.string().trim().default(""),
  currency,
  startDate: dateStr,
  termDays: z.coerce.number().int().min(1, "El plazo debe ser mayor a 0."),
  principal: z.coerce.number().positive("El monto inicial debe ser mayor a 0."),
  tna: z.coerce.number().min(0, "La TNA no puede ser negativa."),
});

export async function renewPlazoFijo(
  sourceId: string,
  input: z.input<typeof renewInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = renewInput.parse(input);
    const source = await PlazoFijo.findOne({ _id: sourceId, userId: uid });
    if (!source) throw new Error("No se encontró el plazo fijo a renovar.");
    if (source.renewed) throw new Error("Ese plazo fijo ya fue renovado.");

    await PlazoFijo.create({ userId: uid, ...data, renewedFromId: sourceId });
    source.renewed = true;
    await source.save();
  });
}

/* ------------------------------ Movements -------------------------------- */

const movementInput = z.object({
  date: dateStr,
  description: z.string().trim().default(""),
  amount: z.coerce
    .number()
    .refine((n) => Number.isFinite(n) && n !== 0, "El monto no puede ser 0."),
});

type PlazoLike = {
  startDate: string;
  termDays: number;
  principal: number;
  movements?: { _id: unknown; date: string; amount: number }[];
};

export async function addPlazoMovement(
  plazoId: string,
  input: z.input<typeof movementInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = movementInput.parse(input);
    const doc = (await PlazoFijo.findOne({ _id: plazoId, userId: uid })
      .lean()) as PlazoLike | null;
    if (!doc) throw new Error("No se encontró el plazo fijo.");
    const endDate = addDays(doc.startDate, doc.termDays);
    if (data.date < doc.startDate || data.date > endDate) {
      throw new Error("La fecha del movimiento debe estar dentro del plazo.");
    }
    const existing = (doc.movements ?? []).map((m) => ({
      date: m.date,
      amount: m.amount,
    }));
    if (
      hasNegativeBalance(doc.principal, doc.startDate, endDate, [
        ...existing,
        data,
      ])
    ) {
      throw new Error("Ese retiro deja el saldo del plazo en negativo.");
    }
    await PlazoFijo.updateOne(
      { _id: plazoId, userId: uid },
      { $push: { movements: data } },
    );
  });
}

export async function updatePlazoMovement(
  plazoId: string,
  movementId: string,
  input: z.input<typeof movementInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = movementInput.parse(input);
    const doc = (await PlazoFijo.findOne({ _id: plazoId, userId: uid })
      .lean()) as PlazoLike | null;
    if (!doc) throw new Error("No se encontró el plazo fijo.");
    const endDate = addDays(doc.startDate, doc.termDays);
    if (data.date < doc.startDate || data.date > endDate) {
      throw new Error("La fecha del movimiento debe estar dentro del plazo.");
    }
    const others = (doc.movements ?? [])
      .filter((m) => String(m._id) !== movementId)
      .map((m) => ({ date: m.date, amount: m.amount }));
    if (
      hasNegativeBalance(doc.principal, doc.startDate, endDate, [
        ...others,
        data,
      ])
    ) {
      throw new Error("Ese retiro deja el saldo del plazo en negativo.");
    }
    await PlazoFijo.updateOne(
      { _id: plazoId, userId: uid },
      {
        $set: {
          "movements.$[m].date": data.date,
          "movements.$[m].description": data.description,
          "movements.$[m].amount": data.amount,
        },
      },
      { arrayFilters: [{ "m._id": movementId }] },
    );
  });
}

export async function deletePlazoMovement(
  plazoId: string,
  movementId: string,
): Promise<ActionResult> {
  return run(async (uid) => {
    await PlazoFijo.updateOne(
      { _id: plazoId, userId: uid },
      { $pull: { movements: { _id: movementId } } },
    );
  });
}
