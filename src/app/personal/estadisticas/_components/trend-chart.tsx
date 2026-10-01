"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney, type Currency } from "@/lib/money";
import { convertAmount } from "@/lib/exchange";
import { periodShortLabel, type Period } from "@/lib/period";
import { EXPENSE_TAGS, EXPENSE_TAG_ICONS, tagColor } from "@/lib/tags";
import type { ExpenseTag, TrendPoint } from "@/features/gastos/types";
import { SegmentedBar } from "./segmented-bar";

/** Orden fijo de los segmentos: etiquetas en su orden canónico y al final "sin etiqueta". */
const SEGMENT_ORDER: (ExpenseTag | null)[] = [...EXPENSE_TAGS, null];

/** ARS / USD: solo esa moneda. Unificado: ARS + USD convertidos a `display`. */
type Mode = "ARS" | "USD" | "unificado";

/**
 * Montos por etiqueta (y total) del mes según el modo: una sola moneda, o
 * ambas convertidas a `display` con `rate` (ARS por USD).
 */
function amountsOf(
  t: TrendPoint,
  mode: Mode,
  display: Currency,
  rate: number,
): { byTag: Map<ExpenseTag | null, number>; total: number } {
  const sources: Currency[] = mode === "unificado" ? ["ARS", "USD"] : [mode];
  const target = mode === "unificado" ? display : mode;
  const byTag = new Map<ExpenseTag | null, number>();
  let total = 0;
  for (const cur of sources) {
    for (const s of t.byTag[cur]) {
      const v = convertAmount(s.amount, cur, target, rate);
      byTag.set(s.tag, (byTag.get(s.tag) ?? 0) + v);
    }
    total += convertAmount(t.total[cur], cur, target, rate);
  }
  return { byTag, total };
}

/** Segmentos positivos de la barra, en orden fijo. */
function segmentsOf(byTag: Map<ExpenseTag | null, number>) {
  return SEGMENT_ORDER.flatMap((tag) => {
    const amount = byTag.get(tag) ?? 0;
    return amount > 0 ? [{ tag, amount }] : [];
  });
}

export function TrendChart({
  trend,
  period,
  monthsAhead,
  today,
  rate,
}: {
  trend: TrendPoint[];
  period: Period;
  monthsAhead: number;
  /** Mes calendario actual, que se resalta en el gráfico. */
  today: Period;
  /** Cotización (ARS por USD) para la vista unificada; null si no está configurada. */
  rate: number | null;
}) {
  const [mode, setMode] = useState<Mode>("ARS");
  const [display, setDisplay] = useState<Currency>("ARS");
  const currency: Currency = mode === "unificado" ? display : mode;
  const canUnify = rate != null && rate > 0;

  const rows = trend.map((t) => {
    const { byTag, total } = amountsOf(t, mode, display, rate ?? 0);
    const segments = segmentsOf(byTag);
    const barTotal = segments.reduce((acc, s) => acc + s.amount, 0);
    return { t, segments, barTotal, total };
  });
  const maxBar = Math.max(1, ...rows.map((r) => r.barTotal));
  const otherCurrency: Currency | null =
    mode === "unificado" ? null : mode === "ARS" ? "USD" : "ARS";
  const hasOther =
    otherCurrency != null && trend.some((t) => t.total[otherCurrency] !== 0);
  const usedTags = SEGMENT_ORDER.filter((tag) =>
    rows.some((r) => r.segments.some((s) => s.tag === tag)),
  );

  const toggleBtn = (active: boolean) =>
    `rounded-md px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      active ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
    }`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Evolución de gastos totales
          </h3>
          <p className="text-xs text-slate-400">
            Últimos {trend.length - monthsAhead} meses hasta{" "}
            {periodShortLabel(period)} y próximos {monthsAhead} (gastos
            cargados más lo disponible de los presupuestos,{" "}
            {mode === "unificado"
              ? `ARS + USD en ${display}`
              : `en ${mode}`}
            , por etiqueta)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "unificado" && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              {(["ARS", "USD"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDisplay(c)}
                  className={toggleBtn(display === c)}
                >
                  en {c}
                </button>
              ))}
            </div>
          )}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            {(["ARS", "USD", "unificado"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                disabled={m === "unificado" && !canUnify}
                title={
                  m === "unificado" && !canUnify
                    ? "Configurá la cotización USD/ARS en Estado contable"
                    : undefined
                }
                className={toggleBtn(mode === m)}
              >
                {m === "unificado" ? "Unificado" : m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {rows.map(({ t, segments, total }) => {
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
              <SegmentedBar
                segments={segments}
                maxBar={maxBar}
                currency={currency}
              />
              <span
                className={`w-28 shrink-0 text-right text-xs font-medium tabular-nums ${
                  isToday ? "text-sky-700" : "text-slate-700"
                }`}
              >
                {formatMoney(total, currency)}
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
      {mode === "unificado" && rate != null && (
        <p className="mt-3 text-xs text-slate-400">
          Cotización usada: {formatMoney(rate, "ARS")} por USD ·{" "}
          <Link
            href="/personal/estado-contable/unificado"
            className="underline underline-offset-2 hover:text-slate-600"
          >
            cambiar
          </Link>
        </p>
      )}
      {hasOther && (
        <p className="mt-3 text-xs text-slate-400">
          También hay gastos en {otherCurrency} en este período: elegí
          «Unificado» para verlos juntos.
        </p>
      )}
      {!canUnify && (
        <p className="mt-3 text-xs text-slate-400">
          Para unificar ARS + USD,{" "}
          <Link
            href="/personal/estado-contable/unificado"
            className="underline underline-offset-2 hover:text-slate-600"
          >
            configurá la cotización
          </Link>
          .
        </p>
      )}
    </section>
  );
}
