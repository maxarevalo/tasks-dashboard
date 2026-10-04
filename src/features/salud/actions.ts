"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { WeightEntry } from "@/models/salud";
import type { ActionResult } from "./types";

const PATH = "/salud";

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

const weightInput = z.object({
  takenAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha y hora inválidas."),
  weight: z.coerce
    .number()
    .min(20, "El peso debe ser de al menos 20 kg.")
    .max(400, "El peso no puede superar los 400 kg."),
});

export async function createWeightEntry(
  input: z.input<typeof weightInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = weightInput.parse(input);
    await WeightEntry.create({ userId: uid, ...data });
  });
}

export async function updateWeightEntry(
  id: string,
  input: z.input<typeof weightInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = weightInput.parse(input);
    await WeightEntry.updateOne({ _id: id, userId: uid }, { $set: data });
  });
}

export async function deleteWeightEntry(id: string): Promise<ActionResult> {
  return run(async (uid) => {
    await WeightEntry.deleteOne({ _id: id, userId: uid });
  });
}
