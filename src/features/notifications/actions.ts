"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/request-context";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import {
  NotificationSettings,
  PushSubscriptionModel,
} from "@/models/notifications";
import { isPushConfigured, sendPush } from "./push";

type ActionResult = { ok: true } | { ok: false; error: string };

async function run(fn: (uid: string) => Promise<void>): Promise<ActionResult> {
  try {
    await requireUser();
    await connectToDatabase();
    const uid = await getActiveProfileKey();
    await fn(uid);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof z.ZodError ? e.issues[0]?.message : (e as Error).message;
    return { ok: false, error: msg ?? "Error inesperado." };
  }
}

const subscriptionInput = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
  device: z.string().max(120).optional(),
});

/** Guarda (o actualiza) el dispositivo para el perfil activo. */
export async function subscribePush(
  input: z.input<typeof subscriptionInput>,
): Promise<ActionResult> {
  return run(async (uid) => {
    if (!isPushConfigured()) {
      throw new Error("Faltan configurar las claves de notificaciones (VAPID).");
    }
    const data = subscriptionInput.parse(input);
    await PushSubscriptionModel.updateOne(
      { endpoint: data.endpoint },
      {
        $set: {
          userId: uid,
          keys: data.keys,
          device: data.device ?? "",
        },
      },
      { upsert: true },
    );
  });
}

export async function unsubscribePush(endpoint: string): Promise<ActionResult> {
  return run(async () => {
    await PushSubscriptionModel.deleteOne({ endpoint });
  });
}

/** Manda una notificación de prueba a este dispositivo. */
export async function sendTestPush(endpoint: string): Promise<ActionResult> {
  return run(async (uid) => {
    const sub = await PushSubscriptionModel.findOne({ endpoint, userId: uid })
      .select("endpoint keys")
      .lean();
    if (!sub) throw new Error("Este dispositivo no tiene las notificaciones activadas.");
    const sent = await sendPush(
      [
        {
          _id: sub._id,
          endpoint: String(sub.endpoint),
          keys: sub.keys as { p256dh: string; auth: string },
        },
      ],
      {
        title: "Notificaciones activadas",
        body: "Así te vamos a avisar de los próximos vencimientos.",
        url: "/personal",
        tag: "prueba",
      },
    );
    if (sent === 0) throw new Error("No se pudo enviar la notificación de prueba.");
  });
}

export async function setNotificationDays(days: number): Promise<ActionResult> {
  return run(async (uid) => {
    const daysBefore = z.number().int().min(0).max(30).parse(days);
    await NotificationSettings.updateOne(
      { userId: uid },
      { $set: { daysBefore } },
      { upsert: true },
    );
  });
}
