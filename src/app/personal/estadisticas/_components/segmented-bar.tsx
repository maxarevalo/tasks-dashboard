"use client";

import { useState } from "react";
import { formatMoney, type Currency } from "@/lib/money";
import { EXPENSE_TAG_ICONS, tagColor } from "@/lib/tags";
import type { ExpenseTag } from "@/features/gastos/types";

export type BarSegment = { tag: ExpenseTag | null; amount: number };

function tagLabel(tag: ExpenseTag | null) {
  return tag ? `${EXPENSE_TAG_ICONS[tag]} ${tag}` : "Sin etiqueta";
}

/**
 * Barra horizontal segmentada por etiqueta. Al pasar el cursor (o tocar) un
 * tramo muestra un tooltip con la etiqueta, el monto y su porcentaje del mes.
 */
export function SegmentedBar({
  segments,
  maxBar,
  currency = "ARS",
}: {
  segments: BarSegment[];
  maxBar: number;
  currency?: Currency;
}) {
  const [active, setActive] = useState<number | null>(null);
  const barTotal = segments.reduce((acc, s) => acc + s.amount, 0);

  let tooltip = null;
  if (active != null && segments[active]) {
    const s = segments[active];
    const before = segments
      .slice(0, active)
      .reduce((acc, x) => acc + x.amount, 0);
    const center = ((before + s.amount / 2) / maxBar) * 100;
    const align =
      center < 15
        ? "translate-x-0"
        : center > 85
          ? "-translate-x-full"
          : "-translate-x-1/2";
    tooltip = (
      <div
        role="tooltip"
        className={`pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg ${align}`}
        style={{ left: `${center}%` }}
      >
        <span
          className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle"
          style={{ backgroundColor: tagColor(s.tag) }}
        />
        <span className="font-medium">{tagLabel(s.tag)}</span>
        <span className="ml-1.5 tabular-nums text-slate-300">
          {formatMoney(s.amount, currency)} ·{" "}
          {Math.round((s.amount / barTotal) * 100)}%
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex-1" onMouseLeave={() => setActive(null)}>
      {tooltip}
      <div className="h-4 overflow-hidden rounded bg-slate-100">
        <div
          className="flex h-full overflow-hidden rounded"
          style={{ width: `${(barTotal / maxBar) * 100}%` }}
        >
          {segments.map((s, i) => (
            <div
              key={s.tag ?? "__none"}
              className={`h-full cursor-default transition-opacity ${
                active != null && active !== i ? "opacity-60" : ""
              }`}
              style={{
                width: `${(s.amount / barTotal) * 100}%`,
                backgroundColor: tagColor(s.tag),
              }}
              aria-label={`${s.tag ?? "Sin etiqueta"}: ${formatMoney(s.amount, currency)}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
