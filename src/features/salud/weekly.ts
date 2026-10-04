import { addDays, daysBetween, type DateStr } from "@/lib/pf";
import type { WeightWeek } from "./types";

/** Lunes de la semana de `date` (semanas de lunes a domingo). */
export function weekStart(date: DateStr): DateStr {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 = domingo
  return addDays(date, -((dow + 6) % 7));
}

/** Agrupa mediciones por semana (lunes a domingo), de la más antigua a la más reciente. */
export function buildWeeks(
  entries: { takenAt: string; weight: number }[],
): WeightWeek[] {
  const byWeek = new Map<DateStr, number[]>();
  for (const e of entries) {
    const start = weekStart(e.takenAt.slice(0, 10));
    byWeek.set(start, [...(byWeek.get(start) ?? []), e.weight]);
  }

  const weeks: WeightWeek[] = [];
  for (const start of [...byWeek.keys()].sort()) {
    const values = byWeek.get(start)!;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const prev = weeks[weeks.length - 1];
    weeks.push({
      start,
      end: addDays(start, 6),
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      delta: prev ? avg - prev.avg : null,
      gapWeeks: prev ? Math.round(daysBetween(prev.start, start) / 7) : null,
    });
  }
  return weeks;
}
