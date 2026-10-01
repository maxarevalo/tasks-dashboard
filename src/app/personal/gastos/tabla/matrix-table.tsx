import { Fragment } from "react";
import { formatMoney } from "@/lib/money";
import { periodShortLabel } from "@/lib/period";
import { CATEGORY_LABELS, type ExpenseMatrix } from "@/features/gastos/types";

function Amount({
  value,
  currency,
  estimated = false,
  strong = false,
}: {
  value: number;
  currency: ExpenseMatrix["currency"];
  estimated?: boolean;
  strong?: boolean;
}) {
  if (!value) return <span className="text-slate-300">—</span>;
  return (
    <span
      className={`tabular-nums ${strong ? "font-semibold text-slate-900" : "text-slate-700"} ${
        estimated ? "italic text-slate-400" : ""
      }`}
      title={estimated ? "Estimado (gasto fijo sin cargar todavía)" : undefined}
    >
      {formatMoney(value, currency)}
      {estimated ? " *" : ""}
    </span>
  );
}

const stickyCol =
  "sticky left-0 z-10 bg-[inherit] px-3 py-2 text-left";

export function MatrixTable({ matrix }: { matrix: ExpenseMatrix }) {
  const { periods, currency, groups, columnTotals, grandTotal } = matrix;

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No hay gastos en {currency} en este rango de meses.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <th className={`${stickyCol} bg-slate-50 font-medium`}>Gasto</th>
            {periods.map((p) => (
              <th
                key={p}
                className="whitespace-nowrap px-3 py-2 text-right font-medium"
              >
                {periodShortLabel(p)}
              </th>
            ))}
            <th className="whitespace-nowrap border-l border-slate-200 px-3 py-2 text-right font-semibold text-slate-700">
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {groups.map((group) => (
            <Fragment key={group.category}>
              <tr className="border-b border-slate-100 bg-white">
                <td
                  className={`${stickyCol} bg-white text-xs font-semibold uppercase tracking-wide text-slate-500`}
                  colSpan={1}
                >
                  {CATEGORY_LABELS[group.category]}
                </td>
                {periods.map((p) => (
                  <td key={p} />
                ))}
                <td className="border-l border-slate-200" />
              </tr>

              {group.rows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-slate-100 bg-white hover:bg-slate-50"
                >
                  <td className={`${stickyCol} bg-white`}>
                    <span className="text-slate-800">{row.description}</span>
                    {row.installment && (
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        cuotas
                      </span>
                    )}
                    {row.cardName && (
                      <span className="ml-1.5 text-xs text-slate-400">
                        {row.cardName}
                      </span>
                    )}
                  </td>
                  {periods.map((p) => {
                    const cell = row.cells[p];
                    return (
                      <td key={p} className="px-3 py-2 text-right">
                        <Amount
                          value={cell?.amount ?? 0}
                          currency={currency}
                          estimated={cell?.estimated}
                        />
                      </td>
                    );
                  })}
                  <td className="border-l border-slate-200 px-3 py-2 text-right">
                    <Amount value={row.total} currency={currency} strong />
                  </td>
                </tr>
              ))}

              <tr className="border-b-2 border-slate-200 bg-slate-50/60">
                <td
                  className={`${stickyCol} bg-slate-50 text-xs font-semibold text-slate-600`}
                >
                  Subtotal {CATEGORY_LABELS[group.category].toLowerCase()}
                </td>
                {periods.map((p) => (
                  <td key={p} className="px-3 py-2 text-right">
                    <Amount
                      value={group.subtotals[p]}
                      currency={currency}
                      strong
                    />
                  </td>
                ))}
                <td className="border-l border-slate-200 px-3 py-2 text-right">
                  <Amount value={group.total} currency={currency} strong />
                </td>
              </tr>
            </Fragment>
          ))}

          <tr className="bg-slate-900 text-white">
            <td
              className={`${stickyCol} bg-slate-900 font-semibold text-white`}
            >
              Total del mes
            </td>
            {periods.map((p) => (
              <td
                key={p}
                className="px-3 py-2 text-right font-semibold tabular-nums"
              >
                {columnTotals[p]
                  ? formatMoney(columnTotals[p], currency)
                  : "—"}
              </td>
            ))}
            <td className="border-l border-slate-700 px-3 py-2 text-right font-bold tabular-nums">
              {formatMoney(grandTotal, currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
