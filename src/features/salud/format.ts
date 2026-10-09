import type { DateStr } from "@/lib/pf";
import type { DateTimeStr } from "./types";

/** "72,4 kg" */
export function formatKg(kg: number, withUnit = true): string {
  const n = kg.toLocaleString("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return withUnit ? `${n} kg` : n;
}

/** "+0,4 kg" / "−0,6 kg" / "0,0 kg" (signo explícito, sin juzgar si es bueno o malo). */
export function formatKgDelta(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${formatKg(Math.abs(rounded))}`;
}

function toDate(date: DateStr): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "4 oct" */
export function shortDay(date: DateStr): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" })
    .format(toDate(date))
    .replace(".", "");
}

/** "29 sep – 5 oct" */
export function weekRangeLabel(start: DateStr, end: DateStr): string {
  return `${shortDay(start)} – ${shortDay(end)}`;
}

/** "sáb 4 oct 2026 · 08:15" ("sáb 4 oct · 08:15" con `withYear` en false). */
export function dateTimeLabel(takenAt: DateTimeStr, withYear = true): string {
  const [date, time] = takenAt.split("T");
  const day = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  })
    .format(toDate(date))
    .replaceAll(".", "")
    .replaceAll(",", "");
  return `${day} · ${time}`;
}

/** Fecha y hora local actual en el formato de los inputs datetime-local. */
export function nowLocal(): DateTimeStr {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** "4 oct 2026" */
export function dayLabel(date: DateStr): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(toDate(date))
    .replaceAll(".", "")
    .replace(/ de /g, " ");
}
