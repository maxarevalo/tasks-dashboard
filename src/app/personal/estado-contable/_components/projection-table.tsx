import { formatMoney } from "@/lib/money";
import { periodLabel } from "@/lib/period";
import type { CurrencyProjection } from "@/features/contable/types";

export function ProjectionTable({ data }: { data: CurrencyProjection }) {
  const { currency } = data;
  const firstNegative = data.months.find((m) => m.balance < 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Proyección {currency}
        </span>
        {firstNegative && (
          <span className="text-xs font-medium text-red-600">
            Saldo negativo desde {periodLabel(firstNegative.period)}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="px-4 py-2 font-medium">Mes</th>
              <th className="px-4 py-2 text-right font-medium">Ingresos</th>
              <th className="px-4 py-2 text-right font-medium">Gastos</th>
              <th className="px-4 py-2 text-right font-medium">Neto</th>
              <th className="px-4 py-2 text-right font-medium">Rendim.</th>
              <th className="px-4 py-2 text-right font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 text-slate-500">
              <td className="px-4 py-2 font-medium">Hoy</td>
              <td className="px-4 py-2 text-right">—</td>
              <td className="px-4 py-2 text-right">—</td>
              <td className="px-4 py-2 text-right">—</td>
              <td className="px-4 py-2 text-right">—</td>
              <td className="px-4 py-2 text-right font-semibold text-slate-900 tabular-nums">
                {formatMoney(data.startingBalance, currency)}
              </td>
            </tr>
            {data.months.map((m) => (
              <tr
                key={m.period}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-4 py-2 text-slate-700">
                  {periodLabel(m.period)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-emerald-700">
                  {m.income ? formatMoney(m.income, currency) : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-red-600">
                  {m.expense ? formatMoney(m.expense, currency) : "—"}
                </td>
                <td
                  className={`px-4 py-2 text-right tabular-nums ${
                    m.net < 0 ? "text-red-600" : "text-slate-700"
                  }`}
                >
                  {formatMoney(m.net, currency)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                  {Math.round(m.interest) !== 0
                    ? formatMoney(m.interest, currency)
                    : "—"}
                </td>
                <td
                  className={`px-4 py-2 text-right font-semibold tabular-nums ${
                    m.balance < 0 ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {formatMoney(m.balance, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
