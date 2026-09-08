import { formatMoney } from "@/lib/money";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type MonthSummary,
} from "@/features/gastos/types";

function Money({ ars, usd }: { ars: number; usd: number }) {
  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold text-slate-900">
        {formatMoney(ars, "ARS")}
      </p>
      <p className="text-xs text-slate-500">{formatMoney(usd, "USD")}</p>
    </div>
  );
}

export function Summary({ summary }: { summary: MonthSummary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Total del mes</p>
          <div className="mt-1">
            <Money ars={summary.total.ARS} usd={summary.total.USD} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Pendiente</p>
          <div className="mt-1">
            <Money ars={summary.pending.ARS} usd={summary.pending.USD} />
          </div>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:col-span-1">
          <p className="text-xs font-medium text-slate-500">Pagado</p>
          <div className="mt-1">
            <Money ars={summary.paid.ARS} usd={summary.paid.USD} />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 text-right font-medium">ARS</th>
              <th className="px-4 py-2 text-right font-medium">USD</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORY_ORDER.map((cat) => {
              const v = summary.byCategory[cat];
              return (
                <tr key={cat} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 text-slate-700">
                    {CATEGORY_LABELS[cat]}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-900">
                    {v.ARS ? formatMoney(v.ARS, "ARS") : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-900">
                    {v.USD ? formatMoney(v.USD, "USD") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
