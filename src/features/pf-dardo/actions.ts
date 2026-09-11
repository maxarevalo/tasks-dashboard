"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { PlazoFijo, PfMovement } from "@/models/pf-dardo";
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

/* ----------------------------- PfMovement ------------------------------- */

const movementInput = z.object({
  date: dateStr,
  description: z.string().trim().min(1, "Falta la descripción."),
  currency,
  amount: z.coerce
    .number()
    .refine((n) => Number.isFinite(n) && n !== 0, "El monto no puede ser 0."),
});

export async function createMovement(
  input: z.input<typeof movementInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = movementInput.parse(input);
    await PfMovement.create({ userId: uid, ...data });
  });
}

export async function updateMovement(
  id: string,
  input: z.input<typeof movementInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = movementInput.parse(input);
    await PfMovement.updateOne({ _id: id, userId: uid }, { $set: data });
  });
}

export async function deleteMovement(id: string): Promise<ActionResult> {
  return run(async (uid) => {
    await PfMovement.deleteOne({ _id: id, userId: uid });
  });
}
