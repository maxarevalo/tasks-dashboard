"use client";

import { Sparkles } from "lucide-react";
import { useAction } from "@/features/gastos/use-action";
import { generateFixedForPeriod } from "@/features/gastos/actions";
import type { Period } from "@/lib/period";

export function GenerateFixedButton({
  period,
  count,
}: {
  period: Period;
  count: number;
}) {
  const { pending, exec, error } = useAction();
  if (count <= 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-amber-900">
          Tenés {count} gasto{count > 1 ? "s" : ""} fijo{count > 1 ? "s" : ""} sin
          cargar en este mes.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => exec(() => generateFixedForPeriod(period))}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {pending ? "Cargando…" : "Cargar ahora"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
