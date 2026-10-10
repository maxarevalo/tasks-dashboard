import { daysBetween, type DateStr } from "@/lib/pf";

/** Cuántos días antes se muestra el aviso dentro de la app. */
export const IN_APP_WINDOW_DAYS = 7;
/** Hasta cuántos días después de vencido se sigue mostrando. */
export const OVERDUE_WINDOW_DAYS = 3;

function toDate(date: DateStr): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "12 oct" */
export function shortDate(date: DateStr): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" })
    .format(toDate(date))
    .replace(".", "");
}

/** "Vence hoy" / "Vence mañana" / "Faltan 2 días" / "Venció hace 1 día". */
export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Vence hoy";
  if (daysLeft === 1) return "Vence mañana";
  if (daysLeft > 1) return `Faltan ${daysLeft} días`;
  const ago = -daysLeft;
  return `Venció hace ${ago} ${ago === 1 ? "día" : "días"}`;
}

/** Días que faltan desde `today` hasta `date` (negativo si ya pasó). */
export function daysUntil(date: DateStr, today: DateStr): number {
  return daysBetween(today, date);
}

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de la app, para el servidor. */
export function todayInAppTz(): DateStr {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE ?? "America/Argentina/Buenos_Aires",
  }).format(new Date());
}
