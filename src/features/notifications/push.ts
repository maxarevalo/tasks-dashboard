import "server-only";
import webpush from "web-push";
import { connectToDatabase } from "@/lib/db";
import { PushSubscriptionModel } from "@/models/notifications";

export type PushPayload = {
  title: string;
  body: string;
  /** Adónde lleva al tocar la notificación. */
  url: string;
  /** Notificaciones con el mismo tag se reemplazan en vez de apilarse. */
  tag?: string;
};

let configured: boolean | null = null;

/** true si están las claves VAPID (si no, la app funciona igual pero sin push). */
export function isPushConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:dashboard@example.com",
    pub,
    priv,
  );
  return (configured = true);
}

type SubDoc = { _id: unknown; endpoint: string; keys: { p256dh: string; auth: string } };

/**
 * Manda la notificación a los dispositivos indicados. Los que el navegador dio
 * de baja (404/410) se borran. Devuelve cuántos la recibieron.
 */
export async function sendPush(subs: SubDoc[], payload: PushPayload): Promise<number> {
  if (!isPushConfigured() || subs.length === 0) return 0;
  await connectToDatabase();
  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          body,
          { TTL: 60 * 60 * 24 },
        );
        sent++;
        await PushSubscriptionModel.updateOne(
          { _id: s._id },
          { $set: { lastSentAt: new Date() } },
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await PushSubscriptionModel.deleteOne({ _id: s._id });
        } else {
          console.error("Error enviando push:", status, (e as Error).message);
        }
      }
    }),
  );
  return sent;
}

/** Dispositivos suscriptos de un perfil. */
export async function subscriptionsFor(uid: string): Promise<SubDoc[]> {
  await connectToDatabase();
  const docs = await PushSubscriptionModel.find({ userId: uid })
    .select("endpoint keys")
    .lean();
  return docs.map((d) => ({
    _id: d._id,
    endpoint: String(d.endpoint),
    keys: d.keys as SubDoc["keys"],
  }));
}
