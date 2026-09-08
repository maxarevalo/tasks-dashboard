"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, currentPeriod, periodLabel, type Period } from "@/lib/period";

export function MonthNav({ period }: { period: Period }) {
  const router = useRouter();
  const go = (p: Period) => router.push(`/personal/gastos?mes=${p}`);
  const isCurrent = period === currentPeriod();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => go(addMonths(period, -1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="min-w-[9.5rem] text-center">
        <p className="text-sm font-semibold text-slate-900">
          {periodLabel(period)}
        </p>
        {!isCurrent && (
          <button
            type="button"
            onClick={() => go(currentPeriod())}
            className="text-xs text-slate-500 underline-offset-2 hover:underline"
          >
            Ir al mes actual
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => go(addMonths(period, 1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
