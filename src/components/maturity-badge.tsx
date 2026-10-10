"use client";

import { CalendarClock } from "lucide-react";
import { todayStr } from "@/lib/pf";
import {
  IN_APP_WINDOW_DAYS,
  daysLeftLabel,
  daysUntil,
  shortDate,
} from "@/lib/maturity";

/** "Vence el 12 oct", o "Faltan 2 días · 12 oct" resaltado cuando está cerca o vencido. */
export function MaturityBadge({ date }: { date: string }) {
  const left = daysUntil(date, todayStr());
  const tone =
    left < 0
      ? "bg-red-50 text-red-700"
      : left <= IN_APP_WINDOW_DAYS
        ? "bg-amber-50 text-amber-800"
        : "bg-slate-100 text-slate-600";
  return (
    <p
      className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${tone}`}
      suppressHydrationWarning
    >
      <CalendarClock className="h-3 w-3" />
      {left <= IN_APP_WINDOW_DAYS
        ? `${daysLeftLabel(left)} · ${shortDate(date)}`
        : `Vence el ${shortDate(date)}`}
    </p>
  );
}
