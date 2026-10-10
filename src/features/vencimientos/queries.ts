import "server-only";
import { connectToDatabase } from "@/lib/db";
import { getActiveProfileKey } from "@/lib/profile";
import { SavingsAccount } from "@/models/contable";
import { PlazoFijo } from "@/models/pf-dardo";
import { NotificationSettings } from "@/models/notifications";
import { mapPlazo } from "@/features/pf-dardo/queries";
import { addDays, type DateStr } from "@/lib/pf";
import type { Currency } from "@/lib/money";
import type { MaturityItem } from "./types";
import {
  IN_APP_WINDOW_DAYS,
  OVERDUE_WINDOW_DAYS,
  daysUntil,
  todayInAppTz,
} from "@/lib/maturity";

export type { MaturityItem };

export const DEFAULT_DAYS_BEFORE = 2;

/** Días de anticipación con los que el perfil quiere los avisos push. */
export async function getDaysBefore(uid: string): Promise<number> {
  await connectToDatabase();
  const doc = await NotificationSettings.findOne({ userId: uid }).lean();
  return (doc?.daysBefore as number | undefined) ?? DEFAULT_DAYS_BEFORE;
}

/**
 * Vencimientos de cuentas remuneradas y plazos fijos vigentes de un perfil
 * entre `today - overdueDays` y `today + aheadDays`, del más próximo al más lejano.
 */
export async function getMaturities(
  uid: string,
  today: DateStr,
  aheadDays: number,
  overdueDays = OVERDUE_WINDOW_DAYS,
): Promise<MaturityItem[]> {
  await connectToDatabase();
  const from = addDays(today, -overdueDays);
  const to = addDays(today, aheadDays);

  const [accounts, plazos] = await Promise.all([
    SavingsAccount.find({
      userId: uid,
      archived: { $ne: true },
      maturityDate: { $gte: from, $lte: to },
    })
      .select("name currency balance maturityDate")
      .lean(),
    PlazoFijo.find({ userId: uid, renewed: { $ne: true } }).lean(),
  ]);

  const items: MaturityItem[] = [
    ...accounts.map((a) => {
      const date = String(a.maturityDate);
      return {
        key: `cuenta:${String(a._id)}:${date}`,
        kind: "cuenta" as const,
        name: String(a.name),
        date,
        daysLeft: daysUntil(date, today),
        currency: a.currency as Currency,
        amount: (a.balance as number) ?? 0,
        href: "/personal/estado-contable/ahorros",
      };
    }),
    ...plazos
      .map((d) => mapPlazo(d as Record<string, unknown>))
      .filter((p) => p.endDate >= from && p.endDate <= to)
      .map((p) => ({
        key: `pf:${p.id}`,
        kind: "plazo_fijo" as const,
        name: p.description || `Plazo fijo ${p.currency}`,
        date: p.endDate,
        daysLeft: daysUntil(p.endDate, today),
        currency: p.currency,
        amount: p.maturityAmount,
        href: "/personal/pf-dardo",
      })),
  ];

  return items.sort((a, b) => a.daysLeft - b.daysLeft || a.name.localeCompare(b.name));
}

/** Para la app: vencimientos del perfil activo a mostrar en la campanita y el Resumen. */
export async function getUpcomingMaturities(): Promise<{
  items: MaturityItem[];
  daysBefore: number;
}> {
  const uid = await getActiveProfileKey();
  const daysBefore = await getDaysBefore(uid);
  const items = await getMaturities(
    uid,
    todayInAppTz(),
    Math.max(IN_APP_WINDOW_DAYS, daysBefore),
  );
  return { items, daysBefore };
}
