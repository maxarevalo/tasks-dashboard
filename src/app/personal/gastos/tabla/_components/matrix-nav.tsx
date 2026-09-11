"use client";

import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  addMonths,
  currentPeriod,
  periodShortLabel,
  type Period,
} from "@/lib/period";
import type { Currency } from "@/lib/money";

export type MatrixMode = "ARS" | "USD" | "unificado";

const WINDOW = 10;

export function MatrixNav({
  from,
  periods,
  mode,
  displayCurrency,
}: {
  from: Period;
  periods: Period[];
  mode: MatrixMode;
  /** Moneda a mostrar cuando `mode === "unificado"`. */
  displayCurrency: Currency;
}) {
  const router = useRouter();
  const last = periods[periods.length - 1];

  const go = (
    nextFrom: Period,
    nextMode: MatrixMode = mode,
    nextDisplay: Currency = displayCurrency,
  ) => {
    const params = new URLSearchParams({ desde: nextFrom, moneda: nextMode });
    if (nextMode === "unificado") params.set("en", nextDisplay);
    router.push(`/personal/gastos/tabla?${params.toString()}`);
  };

  const atCurrent = last === currentPeriod();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => go(addMonths(from, -WINDOW))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
        aria-label="10 meses antes"
        title="10 meses antes"
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => go(addMonths(from, -1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="Un mes antes"
        title="Un mes antes"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="min-w-[10rem] text-center text-sm font-medium text-slate-900">
        {periodShortLabel(from)} — {periodShortLabel(last)}
      </span>

      <button
        type="button"
        onClick={() => go(addMonths(from, 1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        aria-label="Un mes después"
        title="Un mes después"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => go(addMonths(from, WINDOW))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
        aria-label="10 meses después"
        title="10 meses después"
      >
        <ChevronsRight className="h-4 w-4" />
      </button>

      {!atCurrent && (
        <button
          type="button"
          onClick={() => go(addMonths(currentPeriod(), -(WINDOW - 1)))}
          className="text-xs text-slate-500 underline-offset-2 hover:underline"
        >
          Ir al mes actual
        </button>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {mode === "unificado" && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            {(["ARS", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => go(from, "unificado", c)}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  displayCurrency === c
                    ? "bg-slate-700 text-white"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                en {c}
              </button>
            ))}
          </div>
        )}

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {(["ARS", "USD", "unificado"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => go(from, m)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                mode === m
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {m === "unificado" ? "Unificado" : m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
