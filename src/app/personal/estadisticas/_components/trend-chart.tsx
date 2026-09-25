import { formatMoney } from "@/lib/money";
import { periodShortLabel, type Period } from "@/lib/period";
import { EXPENSE_TAGS, EXPENSE_TAG_ICONS, tagColor } from "@/lib/tags";
import type { ExpenseTag, TrendPoint } from "@/features/gastos/types";
import { SegmentedBar } from "./segmented-bar";

/** Orden fijo de los segmentos: etiquetas en su orden canónico y al final "sin etiqueta". */
const SEGMENT_ORDER: (ExpenseTag | null)[] = [...EXPENSE_TAGS, null];

/** Segmentos positivos de la barra, en orden fijo. */
function segmentsOf(t: TrendPoint) {
  const amounts = new Map(t.byTagARS.map((s) => [s.tag, s.amount]));
  return SEGMENT_ORDER.flatMap((tag) => {
    const amount = amounts.get(tag) ?? 0;
    return amount > 0 ? [{ tag, amount }] : [];
  });
}

export function TrendChart({
  trend,
  period,
  monthsAhead,
  today,
}: {
  trend: TrendPoint[];
  period: Period;
  monthsAhead: number;
  /** Mes calendario actual, que se resalta en el gráfico. */
  today: Period;
}) {
  const rows = trend.map((t) => {
    const segments = segmentsOf(t);
    const barTotal = segments.reduce((acc, s) => acc + s.amount, 0);
    return { t, segments, barTotal };
  });
  const maxBar = Math.max(1, ...rows.map((r) => r.barTotal));
  const hasUSD = trend.some((t) => t.total.USD !== 0);
  const usedTags = SEGMENT_ORDER.filter((tag) =>
    rows.some((r) => r.segments.some((s) => s.tag === tag)),
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">
        Evolución de gastos totales
      </h3>
      <p className="mb-3 text-xs text-slate-400">
        Últimos {trend.length - monthsAhead} meses hasta{" "}
        {periodShortLabel(period)} y próximos {monthsAhead} (gastos cargados
        más lo disponible de los presupuestos, en ARS, por etiqueta)
      </p>
      <div className="space-y-1">
        {rows.map(({ t, segments }) => {
          const isToday = t.period === today;
          return (
            <div
              key={t.period}
              className={`-mx-2 flex items-center gap-3 rounded-md px-2 py-0.5 ${
                isToday ? "bg-sky-50 ring-1 ring-sky-200" : ""
              }`}
              aria-current={isToday ? "date" : undefined}
            >
              <span
                className={`w-16 shrink-0 text-xs ${
                  isToday ? "font-semibold text-sky-700" : "text-slate-500"
                }`}
              >
                {periodShortLabel(t.period)}
              </span>
              <SegmentedBar segments={segments} maxBar={maxBar} />
              <span
                className={`w-28 shrink-0 text-right text-xs font-medium tabular-nums ${
                  isToday ? "text-sky-700" : "text-slate-700"
                }`}
              >
                {formatMoney(t.total.ARS, "ARS")}
              </span>
            </div>
          );
        })}
      </div>
      {usedTags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3">
          {usedTags.map((tag) => (
            <li
              key={tag ?? "__none"}
              className="flex items-center gap-1.5 text-xs text-slate-600"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: tagColor(tag) }}
              />
              {tag ? `${EXPENSE_TAG_ICONS[tag]} ${tag}` : "Sin etiqueta"}
            </li>
          ))}
        </ul>
      )}
      {hasUSD && (
        <p className="mt-3 text-xs text-slate-400">
          También hay gastos en USD en este período — el detalle por moneda
          está en las tablas de comparación de abajo.
        </p>
      )}
    </section>
  );
}
