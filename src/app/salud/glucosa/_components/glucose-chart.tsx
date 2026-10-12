"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, daysBetween } from "@/lib/pf";
import {
  dateTimeLabel,
  formatGlucose,
  isFasting,
  shortDay,
} from "@/features/salud/format";
import type { GlucoseEntryDTO } from "@/features/salud/types";

const PAD = { top: 12, right: 46, bottom: 26, left: 40 };
/** Margen en días a cada lado para que los puntos no queden pegados al borde. */
const X_MARGIN_DAYS = 0.5;
const H = 260;
/** Serie (teal, igual que Peso). */
const LINE = "#0d9488";

/**
 * Rangos de referencia de glucosa en ayunas (mg/dL). Solo orientativos:
 * aplican a mediciones en ayunas, no a las de después de comer.
 */
const BANDS = [
  { from: 70, to: 100, label: "70–99", fill: "#16a34a", opacity: 0.08 },
  { from: 100, to: 126, label: "100–125", fill: "#d97706", opacity: 0.1 },
  { from: 126, to: Infinity, label: "126+", fill: "#dc2626", opacity: 0.07 },
] as const;

const RANGES = [
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
  { days: 0, label: "Todo" },
] as const;

/** Minutos desde el inicio del día de `date` para una fecha-hora local. */
function minutesOfDay(takenAt: string): number {
  const [h, m] = takenAt.slice(11).split(":").map(Number);
  return h * 60 + m;
}

export function GlucoseChart({ entries: all }: { entries: GlucoseEntryDTO[] }) {
  const [range, setRange] = useState<number>(30);
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

  if (all.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Cuando registres tu glucosa vas a ver acá cómo evoluciona.
      </section>
    );
  }

  // Cronológico, del más viejo al más nuevo.
  const asc = [...all].reverse();
  const lastDay = asc[asc.length - 1].takenAt.slice(0, 10);
  const from = range > 0 ? addDays(lastDay, -(range - 1)) : asc[0].takenAt.slice(0, 10);
  const points = asc.filter((e) => e.takenAt.slice(0, 10) >= from);

  // Eje X continuo en días (con medio día de margen a cada lado).
  const firstDay = points[0].takenAt.slice(0, 10);
  const totalDays = Math.max(1, daysBetween(firstDay, lastDay) + 1);
  const plotW = W - PAD.left - PAD.right;
  const xDay = (days: number) =>
    PAD.left + ((days + X_MARGIN_DAYS) / (totalDays + 2 * X_MARGIN_DAYS)) * plotW;
  const x = (e: GlucoseEntryDTO) =>
    xDay(daysBetween(firstDay, e.takenAt.slice(0, 10)) + minutesOfDay(e.takenAt) / 1440);

  const values = points.map((e) => e.value);
  const yMin = Math.min(60, Math.floor((Math.min(...values) - 10) / 10) * 10);
  const yMax = Math.max(140, Math.ceil((Math.max(...values) + 10) / 10) * 10);
  const plotH = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const step = yMax - yMin > 200 ? 50 : yMax - yMin > 100 ? 25 : 20;
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) yTicks.push(v);

  const fasting = points.filter((e) => isFasting(e.context));

  // Etiquetas del eje X: algunas fechas repartidas.
  const maxLabels = Math.max(2, Math.floor(plotW / 70));
  const every = Math.max(1, Math.ceil(totalDays / maxLabels));
  const xLabels: string[] = [];
  for (let d = 0; d < totalDays; d += every) xLabels.push(addDays(firstDay, d));

  function onMove(ev: React.MouseEvent | React.TouchEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = "touches" in ev ? ev.touches[0]?.clientX : ev.clientX;
    if (clientX == null) return;
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(x(p) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  }

  const hp = hover != null ? points[hover] : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Evolución</h3>
          <p className="text-xs text-slate-400">
            Las franjas son rangos de referencia en ayunas (orientativos, no
            reemplazan la opinión de un médico).
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => {
                setRange(r.days);
                setHover(null);
              }}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                range === r.days
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
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ aspectRatio: `${W} / ${H}` }}
          role="img"
          aria-label="Glucosa en sangre a lo largo del tiempo"
        >
          {/* Franjas de referencia */}
          {BANDS.map((b) => {
            const top = y(Math.min(b.to, yMax));
            const bottom = y(Math.max(b.from, yMin));
            if (bottom <= top) return null;
            return (
              <g key={b.label}>
                <rect
                  x={PAD.left}
                  y={top}
                  width={plotW}
                  height={bottom - top}
                  fill={b.fill}
                  fillOpacity={b.opacity}
                />
                {/* Etiqueta fuera del área de datos, a la derecha, para no tapar puntos */}
                <text
                  x={W - PAD.right + 4}
                  y={(top + bottom) / 2 + 3}
                  textAnchor="start"
                  className="fill-slate-400"
                  fontSize={9}
                >
                  {b.label}
                </text>
              </g>
            );
          })}

          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(v) + 3}
                textAnchor="end"
                className="fill-slate-400"
                fontSize={10}
              >
                {v}
              </text>
            </g>
          ))}

          {xLabels.map((d) => (
            <text
              key={d}
              x={xDay(daysBetween(firstDay, d) + 0.5)}
              y={H - 8}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize={10}
            >
              {shortDay(d)}
            </text>
          ))}

          {hp && (
            <line
              x1={x(hp)}
              x2={x(hp)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="#94a3b8"
              strokeWidth={1}
            />
          )}

          {/* Línea solo entre mediciones en ayunas (comparables entre sí) */}
          {fasting.length > 1 && (
            <polyline
              points={fasting.map((e) => `${x(e)},${y(e.value)}`).join(" ")}
              fill="none"
              stroke={LINE}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {points.map((e, i) => {
            const fast = isFasting(e.context);
            return (
              <circle
                key={e.id}
                cx={x(e)}
                cy={y(e.value)}
                r={hover === i ? 6 : 4.5}
                fill={fast ? LINE : "#fff"}
                stroke={fast ? "#fff" : LINE}
                strokeWidth={2}
              />
            );
          })}
        </svg>

        <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LINE }} />
            En ayunas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full border-2 bg-white"
              style={{ borderColor: LINE }}
            />
            Otro momento
          </span>
        </div>

        {hp && (
          <div
            className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `${(x(hp) / W) * 100}%`,
              top: 8,
              transform:
                x(hp) > W / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
            }}
          >
            <p className="font-semibold text-slate-900">{formatGlucose(hp.value)}</p>
            <p className="text-slate-600">{hp.context}</p>
            <p className="text-slate-500">{dateTimeLabel(hp.takenAt)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
