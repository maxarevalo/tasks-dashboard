"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, daysBetween } from "@/lib/pf";
import {
  formatKg,
  formatKgDelta,
  shortDay,
  weekRangeLabel,
} from "@/features/salud/format";
import type { WeightEntryDTO, WeightWeek } from "@/features/salud/types";

const PAD = { top: 16, right: 20, bottom: 26, left: 44 };
const LINE_H = 240;
const BARS_H = 120;

/** Serie principal y "bajó" (teal); "subió" (ámbar). Validados para daltonismo. */
const LINE = "#0d9488";
const UP = "#d97706";
const DOWN = "#0d9488";

const RANGES = [
  { weeks: 12, label: "12 sem" },
  { weeks: 26, label: "6 meses" },
  { weeks: 0, label: "Todo" },
] as const;

/** Paso "lindo" para el eje Y en kg, con a lo sumo ~5 marcas. */
function niceStep(span: number): number {
  for (const s of [0.1, 0.2, 0.5, 1, 2, 5, 10, 20]) {
    if (span / s <= 5) return s;
  }
  return 50;
}

export function WeightChart({
  weeks: allWeeks,
  entries: allEntries,
}: {
  weeks: WeightWeek[];
  entries: WeightEntryDTO[];
}) {
  const [range, setRange] = useState<number>(12);
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Se dibuja al ancho real del contenedor para que los textos no se achiquen en el celular.
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setW(Math.max(300, Math.round(entry.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (allWeeks.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Cuando registres tu peso vas a ver acá el progreso semana a semana.
      </section>
    );
  }

  const lastWeek = allWeeks[allWeeks.length - 1];
  const from =
    range > 0 ? addDays(lastWeek.start, -(range - 1) * 7) : allWeeks[0].start;
  const weeks = allWeeks.filter((w) => w.start >= from);
  const entries = allEntries.filter((e) => e.takenAt.slice(0, 10) >= from);

  // Eje X continuo en días: del lunes de la primera semana al domingo de la última.
  const domainStart = weeks[0].start;
  const totalDays = daysBetween(domainStart, lastWeek.end) + 1;
  const weekSlots = Math.round(totalDays / 7);
  const plotW = W - PAD.left - PAD.right;
  const xDay = (days: number) => PAD.left + (days / totalDays) * plotW;
  const xWeek = (w: WeightWeek) => xDay(daysBetween(domainStart, w.start) + 3.5);
  const xEntry = (e: WeightEntryDTO) => {
    const [h, m] = e.takenAt.slice(11).split(":").map(Number);
    return xDay(daysBetween(domainStart, e.takenAt.slice(0, 10)) + (h * 60 + m) / 1440);
  };

  // Eje Y del promedio (incluye las mediciones sueltas para que no queden afuera).
  const values = [...weeks.map((w) => w.avg), ...entries.map((e) => e.weight)];
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const step = niceStep(Math.max(rawMax - rawMin, 0.4));
  const yMin = Math.floor((rawMin - step * 0.3) / step) * step;
  const yMax = Math.ceil((rawMax + step * 0.3) / step) * step;
  const lineH = LINE_H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + lineH - ((v - yMin) / (yMax - yMin)) * lineH;
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += step) yTicks.push(v);

  // Tramos de la línea: sólidos entre semanas consecutivas, punteados si hay semanas sin datos.
  const segments = weeks.slice(1).map((w, i) => ({
    from: weeks[i],
    to: w,
    gap: (w.gapWeeks ?? 1) > 1,
  }));

  // Barras de cambio semanal (diverge en 0).
  const deltas = weeks.map((w) => w.delta ?? 0);
  const maxAbs = Math.max(0.2, ...deltas.map(Math.abs));
  const barsPlotH = BARS_H - 12 - 20;
  const zeroY = 12 + barsPlotH / 2;
  const barY = (d: number) => zeroY - (d / maxAbs) * (barsPlotH / 2);
  const barW = Math.max(4, Math.min(28, (plotW / weekSlots) * 0.55));

  // Etiquetas del eje X: lunes de algunas semanas.
  const maxLabels = Math.max(3, Math.floor(plotW / 70));
  const labelEvery = Math.max(1, Math.ceil(weeks.length / maxLabels));
  const xLabels = weeks.filter(
    (_, i) => i % labelEvery === 0 || i === weeks.length - 1,
  );

  function onMove(e: React.MouseEvent | React.TouchEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX == null) return;
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    weeks.forEach((w, i) => {
      const d = Math.abs(xWeek(w) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  }

  const hw = hover != null ? weeks[hover] : null;
  const last = weeks[weeks.length - 1];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Progreso semanal
          </h3>
          <p className="text-xs text-slate-400">
            Promedio de cada semana (lunes a domingo); los puntos claros son
            las mediciones sueltas.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.weeks}
              type="button"
              onClick={() => {
                setRange(r.weeks);
                setHover(null);
              }}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                range === r.weeks
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onTouchStart={onMove}
        onTouchMove={onMove}
      >
        <svg
          viewBox={`0 0 ${W} ${LINE_H}`}
          className="w-full"
          style={{ aspectRatio: `${W} / ${LINE_H}` }}
          role="img"
          aria-label="Promedio semanal de peso"
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(v) + 3}
                textAnchor="end"
                className="fill-slate-400"
                fontSize={10}
              >
                {formatKg(v, false)}
              </text>
            </g>
          ))}

          {xLabels.map((w) => (
            <text
              key={w.start}
              x={xWeek(w)}
              y={LINE_H - 8}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize={10}
            >
              {shortDay(w.start)}
            </text>
          ))}

          {hw && (
            <line
              x1={xWeek(hw)}
              x2={xWeek(hw)}
              y1={PAD.top}
              y2={PAD.top + lineH}
              stroke="#94a3b8"
              strokeWidth={1}
            />
          )}

          {/* Mediciones sueltas, tenues */}
          {entries.map((e) => (
            <circle
              key={e.id}
              cx={xEntry(e)}
              cy={y(e.weight)}
              r={2.5}
              fill={LINE}
              fillOpacity={0.25}
            />
          ))}

          {segments.map((s) => (
            <line
              key={s.to.start}
              x1={xWeek(s.from)}
              y1={y(s.from.avg)}
              x2={xWeek(s.to)}
              y2={y(s.to.avg)}
              stroke={LINE}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={s.gap ? "4 4" : undefined}
            />
          ))}

          {weeks.map((w, i) => (
            <circle
              key={w.start}
              cx={xWeek(w)}
              cy={y(w.avg)}
              r={hover === i ? 5.5 : 4}
              fill={LINE}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}

          {/* Etiqueta directa del último promedio */}
          <text
            x={xWeek(last)}
            y={y(last.avg) - 10}
            textAnchor={weeks.length > 1 ? "end" : "middle"}
            className="fill-slate-900"
            fontSize={11}
            fontWeight={600}
          >
            {formatKg(last.avg)}
          </text>
        </svg>

        <p className="mt-2 text-xs font-medium text-slate-500">
          Cambio contra la semana anterior
        </p>
        <svg
          viewBox={`0 0 ${W} ${BARS_H}`}
          className="w-full"
          style={{ aspectRatio: `${W} / ${BARS_H}` }}
          role="img"
          aria-label="Cambio de peso semana a semana"
        >
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={zeroY}
            y2={zeroY}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 8}
            y={zeroY + 3}
            textAnchor="end"
            className="fill-slate-400"
            fontSize={10}
          >
            0
          </text>
          {weeks.map((w, i) => {
            if (w.delta == null || Math.abs(w.delta) < 0.005) return null;
            const top = Math.min(barY(w.delta), zeroY);
            const h = Math.max(1, Math.abs(barY(w.delta) - zeroY));
            return (
              <rect
                key={w.start}
                x={xWeek(w) - barW / 2}
                y={top}
                width={barW}
                height={h}
                rx={3}
                fill={w.delta > 0 ? UP : DOWN}
                fillOpacity={hover == null || hover === i ? 1 : 0.45}
              />
            );
          })}
          {last.delta != null && (
            <text
              x={xWeek(last)}
              y={
                last.delta > 0 ? barY(last.delta) - 5 : barY(last.delta) + 13
              }
              textAnchor="middle"
              className="fill-slate-700"
              fontSize={10}
              fontWeight={600}
            >
              {formatKgDelta(last.delta)}
            </text>
          )}
        </svg>
        <div className="mt-1 flex gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: DOWN }} />
            Bajó
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: UP }} />
            Subió
          </span>
        </div>

        {hw && (
          <div
            className="pointer-events-none absolute z-10 min-w-44 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `${(xWeek(hw) / W) * 100}%`,
              top: 8,
              transform:
                xWeek(hw) > W / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
            }}
          >
            <p className="font-semibold text-slate-900">
              {weekRangeLabel(hw.start, hw.end)}
            </p>
            <p className="text-slate-700">
              Promedio: <span className="font-medium">{formatKg(hw.avg)}</span>
            </p>
            {hw.delta != null && (
              <p className="text-slate-600">
                {formatKgDelta(hw.delta)}{" "}
                {(hw.gapWeeks ?? 1) > 1
                  ? `vs hace ${hw.gapWeeks} semanas`
                  : "vs semana anterior"}
              </p>
            )}
            <p className="text-slate-500">
              {hw.count} {hw.count > 1 ? "mediciones" : "medición"}
              {hw.count > 1 &&
                ` · ${formatKg(hw.min, false)}–${formatKg(hw.max)}`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
