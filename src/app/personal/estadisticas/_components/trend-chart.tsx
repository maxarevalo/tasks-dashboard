import { formatMoney } from "@/lib/money";
import { periodShortLabel } from "@/lib/period";
import type { TrendPoint } from "@/features/gastos/types";

export function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const maxARS = Math.max(1, ...trend.map((t) => Math.abs(t.total.ARS)));
  const hasUSD = trend.some((t) => t.total.USD !== 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">
        Evolución de gastos totales
      </h3>
      <p className="mb-3 text-xs text-slate-400">
        Últimos {trend.length} meses (gastos cargados, en ARS)
      </p>
      <div className="space-y-2">
        {trend.map((t) => (
          <div key={t.period} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-slate-500">
              {periodShortLabel(t.period)}
            </span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
              <div
                className="h-full rounded bg-slate-900"
                style={{
                  width: `${(Math.abs(t.total.ARS) / maxARS) * 100}%`,
                }}
              />
            </div>
            <span className="w-28 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">
              {formatMoney(t.total.ARS, "ARS")}
            </span>
          </div>
        ))}
      </div>
      {hasUSD && (
        <p className="mt-3 text-xs text-slate-400">
          También hay gastos en USD en este período — el detalle por moneda
          está en las tablas de comparación de abajo.
        </p>
      )}
    </section>
  );
}
