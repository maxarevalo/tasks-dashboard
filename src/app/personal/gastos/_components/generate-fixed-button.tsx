"use client";

import { Sparkles, CreditCard } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { periodLabel, type Period } from "@/lib/period";
import { useAction } from "@/features/gastos/use-action";
import { generateFixedForPeriod } from "@/features/gastos/actions";
import { CATEGORY_LABELS, type PendingFixedItem } from "@/features/gastos/types";

export function GenerateFixedButton({
  period,
  items,
}: {
  period: Period;
  items: PendingFixedItem[];
}) {
  const { pending, exec, error } = useAction();
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">
        Gastos fijos sin cargar en {periodLabel(period)} ({items.length})
      </p>
      <p className="mt-0.5 text-xs text-amber-700">
        Revisá el detalle y confirmá para agregarlos a este mes.
      </p>

      <ul className="mt-3 divide-y divide-amber-200/70 overflow-hidden rounded-lg border border-amber-200 bg-white">
        {items.map((it) => (
          <li
            key={it.id}
            className="flex items-center gap-3 px-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">
                {it.description}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                <span>{CATEGORY_LABELS[it.category]}</span>
                {it.cardName && (
                  <span className="inline-flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    {it.cardName}
                  </span>
                )}
              </p>
            </div>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular-nums text-slate-900">
                {formatMoney(it.amount, it.currency)}
              </span>
              <span className="text-[10px] text-slate-400">{it.currency}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2">
        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => exec(() => generateFixedForPeriod(period))}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {pending
            ? "Cargando…"
            : `Cargar ${items.length === 1 ? "este gasto" : `estos ${items.length}`}`}
        </button>
      </div>
    </div>
  );
}
