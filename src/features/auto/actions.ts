"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { FuelLog, UpcomingService, ServiceRecord } from "@/models/auto";
import type { ActionResult } from "./types";

const PATH = "/personal/auto";

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

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida.");
const currency = z.enum(["ARS", "USD"]);
const plate = z
  .string()
  .trim()
  .min(1, "Falta la patente.")
  .transform((s) => s.toUpperCase());

/* ------------------------------- FuelLog --------------------------------- */

const fuelLogInput = z.object({
  plate,
  date: dateStr,
  km: z.coerce.number().min(0, "El kilometraje no puede ser negativo."),
  liters: z.coerce.number().positive("Los litros deben ser mayor a 0."),
  amount: z.coerce.number().positive("El gasto debe ser mayor a 0."),
  currency,
});

export async function createFuelLog(
  input: z.input<typeof fuelLogInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = fuelLogInput.parse(input);
    await FuelLog.create({ userId: uid, ...data });
  });
}

export async function updateFuelLog(
  id: string,
  input: z.input<typeof fuelLogInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = fuelLogInput.parse(input);
    await FuelLog.updateOne({ _id: id, userId: uid }, { $set: data });
  });
}

export async function deleteFuelLog(id: string): Promise<ActionResult> {
  return run(async (uid) => {
    await FuelLog.deleteOne({ _id: id, userId: uid });
  });
}

/* ---------------------------- UpcomingService ----------------------------- */

const upcomingServiceInput = z.object({
  plate,
  loadedDate: dateStr,
  nextServiceDate: dateStr,
  description: z.string().trim().default(""),
  mechanic: z.string().trim().default(""),
});

export async function createUpcomingService(
  input: z.input<typeof upcomingServiceInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = upcomingServiceInput.parse(input);
    await UpcomingService.create({ userId: uid, ...data });
  });
}

export async function updateUpcomingService(
  id: string,
  input: z.input<typeof upcomingServiceInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = upcomingServiceInput.parse(input);
    await UpcomingService.updateOne({ _id: id, userId: uid }, { $set: data });
  });
}

export async function deleteUpcomingService(id: string): Promise<ActionResult> {
  return run(async (uid) => {
    await UpcomingService.deleteOne({ _id: id, userId: uid });
  });
}

/* ----------------------------- ServiceRecord ------------------------------ */

const serviceRecordInput = z.object({
  plate,
  date: dateStr,
  description: z.string().trim().min(1, "Falta la descripción."),
  amount: z.coerce.number().positive("El gasto debe ser mayor a 0."),
  currency,
  parts: z.array(z.string().trim().min(1)).default([]),
});

export async function createServiceRecord(
  input: z.input<typeof serviceRecordInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = serviceRecordInput.parse(input);
    await ServiceRecord.create({ userId: uid, ...data });
  });
}

export async function updateServiceRecord(
  id: string,
  input: z.input<typeof serviceRecordInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    const data = serviceRecordInput.parse(input);
    await ServiceRecord.updateOne({ _id: id, userId: uid }, { $set: data });
  });
}

export async function deleteServiceRecord(id: string): Promise<ActionResult> {
  return run(async (uid) => {
    await ServiceRecord.deleteOne({ _id: id, userId: uid });
  });
}
