import { formatMoney, CURRENCIES, type Currency } from "@/lib/money";
import type { ComparisonRow } from "@/features/gastos/types";

type FlatRow = {
  key: string;
  label: string;
  icon: string | null;
  currency: Currency;
  current: number;
  previous: number;
};

export function ComparisonSection({
  title,
  rows,
}: {
  title: string;
  rows: ComparisonRow[];
}) {
  const flatRows: FlatRow[] = rows.flatMap((r) =>
    CURRENCIES.filter((c) => r.current[c] !== 0 || r.previous[c] !== 0).map(
      (c) => ({
        key: `${r.key}-${c}`,
        label: r.label,
        icon: r.icon,
        currency: c,
        current: r.current[c],
        previous: r.previous[c],
      }),
    ),
  );

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
        {title}
      </header>

      {flatRows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          No hay gastos para comparar este mes.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-500">
                <th className="px-4 py-2 text-left font-medium">Concepto</th>
                <th className="px-4 py-2 text-right font-medium">Este mes</th>
                <th className="px-4 py-2 text-right font-medium">
                  Mes anterior
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  Diferencia
                </th>
              </tr>
            </thead>
            <tbody>
              {flatRows.map((r) => (
                <ComparisonRowLine key={r.key} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ComparisonRowLine({ row: r }: { row: FlatRow }) {
  const diff = r.current - r.previous;
  const pct = r.previous !== 0 ? (diff / Math.abs(r.previous)) * 100 : null;
  const isNew = r.previous === 0 && r.current !== 0;
  const worse = diff > 0;
  const tone = diff === 0 ? "text-slate-400" : worse ? "text-red-600" : "text-emerald-600";

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-4 py-2 text-slate-800">
        {r.icon && <span className="mr-1.5">{r.icon}</span>}
        {r.label}
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-900">
        {formatMoney(r.current, r.currency)}
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-500">
        {formatMoney(r.previous, r.currency)}
      </td>
      <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
        <span className={tone}>
          {diff > 0 ? "+" : diff < 0 ? "-" : ""}
          {formatMoney(Math.abs(diff), r.currency)}
        </span>
        {isNew ? (
          <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            nuevo
          </span>
        ) : (
          pct != null &&
          diff !== 0 && (
            <span className={`ml-1.5 text-xs ${worse ? "text-red-500" : "text-emerald-500"}`}>
              ({pct > 0 ? "+" : ""}
              {pct.toFixed(0)}%)
            </span>
          )
        )}
      </td>
    </tr>
  );
}
