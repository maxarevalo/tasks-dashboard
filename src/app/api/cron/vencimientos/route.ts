import { timingSafeEqual } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { daysLeftLabel, shortDate, todayInAppTz } from "@/lib/maturity";
import { NotificationLog, PushSubscriptionModel } from "@/models/notifications";
import { getDaysBefore, getMaturities } from "@/features/vencimientos/queries";
import { isPushConfigured, sendPush, subscriptionsFor } from "@/features/notifications/push";

/**
 * Lo llama el cron de Vercel una vez por día (ver vercel.json) con
 * `Authorization: Bearer $CRON_SECRET`. Para cada perfil con dispositivos
 * suscriptos manda un aviso por cada vencimiento que esté dentro de los días de
 * anticipación elegidos (cada día hasta el vencimiento), sin repetir en el día.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (
    !secret ||
    auth.length !== expected.length ||
    !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))
  ) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return Response.json({ ok: false, error: "Faltan las claves VAPID." }, { status: 500 });
  }

  await connectToDatabase();
  const today = todayInAppTz();
  const profiles: string[] = await PushSubscriptionModel.distinct("userId");
  let sent = 0;

  for (const uid of profiles) {
    const daysBefore = await getDaysBefore(uid);
    const items = (await getMaturities(uid, today, daysBefore, 0)).filter(
      (i) => i.daysLeft >= 0,
    );
    if (items.length === 0) continue;
    const subs = await subscriptionsFor(uid);

    for (const item of items) {
      // Un aviso por vencimiento por día, aunque el cron corra más de una vez.
      const logKey = `${item.key}:${today}`;
      if (await NotificationLog.exists({ userId: uid, key: logKey })) continue;

      const n = await sendPush(subs, {
        title: `${daysLeftLabel(item.daysLeft)}: ${item.name}`,
        body: `${item.kind === "plazo_fijo" ? "Plazo fijo" : "Cuenta"} · vence el ${shortDate(item.date)} · ${formatMoney(item.amount, item.currency)} ${item.currency}`,
        url: item.href,
        tag: item.key,
      });
      // Solo se marca como avisado si llegó a algún dispositivo: si no, se reintenta.
      if (n > 0) {
        await NotificationLog.updateOne(
          { userId: uid, key: logKey },
          { $setOnInsert: { userId: uid, key: logKey } },
          { upsert: true },
        );
        sent += n;
      }
    }
  }

  return Response.json({ ok: true, today, profiles: profiles.length, sent });
}
