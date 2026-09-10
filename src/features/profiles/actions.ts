"use server";

import mongoose from "mongoose";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Profile, PROFILE_COOKIE } from "@/models/profile";
import { Card, Expense, FixedExpense } from "@/models/gastos";
import { SavingsAccount, Income } from "@/models/contable";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function guard() {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  await connectToDatabase();
}

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await guard();
    await fn();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof z.ZodError ? e.issues[0]?.message : (e as Error).message;
    return { ok: false, error: msg ?? "Error inesperado." };
  }
}

const nameInput = z
  .string()
  .trim()
  .min(1, "Falta el nombre.")
  .max(40, "Máximo 40 caracteres.");

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "perfil"
  );
}

async function uniqueKey(base: string): Promise<string> {
  let key = base;
  let n = 1;
  while (await Profile.exists({ key })) {
    n += 1;
    key = `${base}-${n}`;
  }
  return key;
}

async function setCookie(key: string) {
  (await cookies()).set(PROFILE_COOKIE, key, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

const SCOPED = [Card, Expense, FixedExpense, SavingsAccount, Income] as const;

/* ----------------------------------------------------------------------- */

export async function switchProfile(key: string): Promise<ActionResult> {
  return run(async () => {
    const exists = await Profile.exists({ key });
    if (!exists) throw new Error("El perfil no existe.");
    await setCookie(key);
  });
}

export async function createProfile(
  input: z.input<typeof nameInput>,
): Promise<ActionResult> {
  return run(async () => {
    const name = nameInput.parse(input);
    const key = await uniqueKey(slugify(name));
    await Profile.create({ name, key });
    await setCookie(key);
  });
}

export async function renameProfile(
  id: string,
  input: z.input<typeof nameInput>,
): Promise<ActionResult> {
  return run(async () => {
    const name = nameInput.parse(input);
    await Profile.updateOne({ _id: id }, { $set: { name } });
  });
}

export async function deleteProfile(id: string): Promise<ActionResult> {
  return run(async () => {
    const [profile, count] = await Promise.all([
      Profile.findById(id).lean(),
      Profile.countDocuments(),
    ]);
    if (!profile) throw new Error("El perfil no existe.");
    if (count <= 1) throw new Error("No podés borrar el único perfil.");

    const key = (profile as { key: string }).key;
    await Promise.all(SCOPED.map((M) => M.deleteMany({ userId: key })));
    await Profile.deleteOne({ _id: id });

    const current = (await cookies()).get(PROFILE_COOKIE)?.value;
    if (current === key) {
      const fallback = await Profile.findOne().sort({ createdAt: 1 }).lean();
      if (fallback) await setCookie((fallback as { key: string }).key);
    }
  });
}

export async function duplicateProfile(
  id: string,
  input: z.input<typeof nameInput>,
): Promise<ActionResult> {
  return run(async () => {
    const name = nameInput.parse(input);
    const source = await Profile.findById(id).lean();
    if (!source) throw new Error("El perfil a copiar no existe.");
    const src = (source as { key: string }).key;
    const dest = await uniqueKey(slugify(name));
    await Profile.create({ name, key: dest });

    const strip = (d: Record<string, unknown>) => {
      const { _id, __v, createdAt, updatedAt, ...rest } = d;
      void _id;
      void __v;
      void createdAt;
      void updatedAt;
      return rest;
    };
    const newId = () => new mongoose.Types.ObjectId();

    // 1. Tarjetas (con mapa old->new)
    const cards = await Card.find({ userId: src }).lean();
    const cardMap = new Map<string, mongoose.Types.ObjectId>();
    const newCards = cards.map((c) => {
      const _id = newId();
      cardMap.set(String(c._id), _id);
      return { ...strip(c as Record<string, unknown>), _id, userId: dest };
    });
    if (newCards.length) await Card.insertMany(newCards);

    // 2. Gastos fijos (remap cardId, mapa old->new)
    const fixed = await FixedExpense.find({ userId: src }).lean();
    const fixedMap = new Map<string, mongoose.Types.ObjectId>();
    const newFixed = fixed.map((f) => {
      const _id = newId();
      fixedMap.set(String(f._id), _id);
      const base = strip(f as Record<string, unknown>);
      return {
        ...base,
        _id,
        userId: dest,
        cardId: f.cardId ? cardMap.get(String(f.cardId)) : undefined,
      };
    });
    if (newFixed.length) await FixedExpense.insertMany(newFixed);

    // 3. Ahorros e ingresos (sin refs cruzadas)
    for (const M of [SavingsAccount, Income]) {
      const docs = await M.find({ userId: src }).lean();
      if (docs.length) {
        await M.insertMany(
          docs.map((d) => ({
            ...strip(d as Record<string, unknown>),
            _id: newId(),
            userId: dest,
          })),
        );
      }
    }

    // 4. Gastos (remap cardId y fixedId)
    const expenses = await Expense.find({ userId: src }).lean();
    if (expenses.length) {
      await Expense.insertMany(
        expenses.map((e) => ({
          ...strip(e as Record<string, unknown>),
          _id: newId(),
          userId: dest,
          cardId: e.cardId ? cardMap.get(String(e.cardId)) : undefined,
          fixedId: e.fixedId ? fixedMap.get(String(e.fixedId)) : undefined,
        })),
      );
    }

    await setCookie(dest);
  });
}
