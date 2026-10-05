import { formatMoney, type Currency } from "@/lib/money";
import { dateLabel } from "@/lib/pf";
import { periodLabel } from "@/lib/period";
import type { ReconciliationDTO } from "@/features/contable/types";

const MODE_LABEL = {
  gasto: "gasto no registrado",
  ajuste: "ajuste",
  igual: "coincidía",
} as const;

/** Últimos cierres: qué decía la app, qué había de verdad y cómo se registró. */
export function CierreHistory({ history }: { history: ReconciliationDTO[] }) {
  if (history.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">Cierres anteriores</h3>
      <ul className="space-y-2">
        {history.map((r) => {
          const totals = (["ARS", "USD"] as Currency[])
            .map((c) => ({
              c,
              diff: r.items
                .filter((i) => i.currency === c)
                .reduce((acc, i) => acc + (i.realBalance - i.appBalance), 0),
              any: r.items.some((i) => i.currency === c),
            }))
            .filter((t) => t.any);
          return (
            <li
              key={r.id}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">
                  {periodLabel(r.period)}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {dateLabel(r.date)}
                  </span>
                </p>
                <p className="text-xs tabular-nums text-slate-600">
                  {totals
                    .map(
                      (t) =>
                        `${t.diff > 0 ? "+" : t.diff < 0 ? "−" : ""}${formatMoney(Math.abs(t.diff), t.c)}`,
                    )
                    .join(" · ")}
                </p>
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                {r.items.map((i) => (
                  <li key={i.accountId} className="flex flex-wrap gap-x-2">
                    <span className="text-slate-700">{i.name}:</span>
                    <span className="tabular-nums">
                      app {formatMoney(i.appBalance, i.currency)} → real{" "}
                      {formatMoney(i.realBalance, i.currency)}
                    </span>
                    <span className="text-slate-400">({MODE_LABEL[i.mode]})</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
