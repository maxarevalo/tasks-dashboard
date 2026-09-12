"use client";

import { useRef, useState } from "react";
import { formatMoney, type Currency } from "@/lib/money";
import { periodShortLabel } from "@/lib/period";
import type { ProjectionMonth } from "@/features/contable/types";

const W = 720;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

export function ProjectionChart({
  title,
  currency,
  startingBalance,
  months,
  realOffset,
}: {
  title: string;
  currency: Currency;
  startingBalance: number;
  months: ProjectionMonth[];
  /**
   * Si se pasa, dibuja una segunda línea paralela "Ahorro real" = saldo -
   * realOffset (ej. el total de plazos fijos de PF Dardo hoy). Se mantiene
   * constante a lo largo de toda la proyección: es una comparación visual
   * rápida, no una proyección independiente.
   */
  realOffset?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const showReal = realOffset != null && realOffset !== 0;

  const points = [
    { label: "hoy", balance: startingBalance, month: null as ProjectionMonth | null },
    ...months.map((m) => ({
      label: periodShortLabel(m.period),
      balance: m.balance,
      month: m,
    })),
  ];

  const values = points.map((p) => p.balance);
  if (showReal) values.push(...points.map((p) => p.balance - realOffset));
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const span = rawMax - rawMin || 1;
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.08;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? 0 : (i / (points.length - 1)) * plotW);
  const y = (v: number) =>
    PAD.top + plotH - ((v - min) / (max - min)) * plotH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.balance)}`)
    .join(" ");
  const areaPath =
    `${linePath} L ${x(points.length - 1)} ${y(min)} L ${x(0)} ${y(min)} Z`;
  const realLinePath = showReal
    ? points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.balance - realOffset)}`)
        .join(" ")
    : "";

  const zeroY = y(0);
  const showZero = 0 >= min && 0 <= max;

  // etiquetas del eje X: primera, última y ~4 intermedias
  const step = Math.max(1, Math.round(points.length / 6));
  const xTicks = points
    .map((_, i) => i)
    .filter((i) => i % step === 0 || i === points.length - 1);

  const yTicks = [min, min + (max - min) / 2, max].map((v) => ({
    v,
    y: y(v),
  }));

  function onMove(e: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(
      ((px - PAD.left) / plotW) * (points.length - 1),
    );
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  }

  const hp = hover != null ? points[hover] : null;

  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4">
      <figcaption className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-900">
        {title}
        {showReal && (
          <span className="flex items-center gap-3 text-xs font-normal text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-[#0f766e]" />
              Saldo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full border-t-2 border-dashed border-[#d97706]" />
              Ahorro real
            </span>
          </span>
        )}
      </figcaption>
      <div
        ref={wrapRef}
        className="relative"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ aspectRatio: `${W} / ${H}` }}
          role="img"
          aria-label={`${title}: saldo proyectado por mes`}
        >
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={t.y}
                y2={t.y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={t.y + 3}
                textAnchor="end"
                className="fill-slate-400"
                fontSize={10}
              >
                {compact(t.v, currency)}
              </text>
            </g>
          ))}

          {showZero && (
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={zeroY}
              y2={zeroY}
              stroke="#cbd5e1"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}

          <path d={areaPath} fill="#0f766e" fillOpacity={0.08} />
          <path
            d={linePath}
            fill="none"
            stroke="#0f766e"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {showReal && (
            <path
              d={realLinePath}
              fill="none"
              stroke="#d97706"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {xTicks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize={10}
            >
              {points[i].label}
            </text>
          ))}

          {hp && (
            <>
              <line
                x1={x(hover!)}
                x2={x(hover!)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="#94a3b8"
                strokeWidth={1}
              />
              <circle
                cx={x(hover!)}
                cy={y(hp.balance)}
                r={4.5}
                fill="#0f766e"
                stroke="#fff"
                strokeWidth={2}
              />
              {showReal && (
                <circle
                  cx={x(hover!)}
                  cy={y(hp.balance - realOffset)}
                  r={4.5}
                  fill="#d97706"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}
            </>
          )}

          {/* etiqueta directa del último punto */}
          <text
            x={x(points.length - 1)}
            y={y(points[points.length - 1].balance) - 8}
            textAnchor="end"
            className="fill-slate-900"
            fontSize={11}
            fontWeight={600}
          >
            {compact(points[points.length - 1].balance, currency)}
          </text>
          {showReal && (
            <text
              x={x(points.length - 1)}
              y={y(points[points.length - 1].balance - realOffset) + 14}
              textAnchor="end"
              fill="#d97706"
              fontSize={11}
              fontWeight={600}
            >
              {compact(points[points.length - 1].balance - realOffset, currency)}
            </text>
          )}
        </svg>

        {hp && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `${(x(hover!) / W) * 100}%`,
              top: 4,
              transform:
                hover! > points.length / 2
                  ? "translateX(-100%)"
                  : "translateX(8px)",
            }}
          >
            <p className="font-semibold text-slate-900">
              {hp.label === "hoy" ? "Hoy" : hp.label}
            </p>
            <p className="text-slate-600">
              Saldo: {formatMoney(hp.balance, currency)}
            </p>
            {showReal && (
              <p className="text-amber-700">
                Ahorro real: {formatMoney(hp.balance - realOffset, currency)}
              </p>
            )}
            {hp.month && (
              <>
                <p className="text-emerald-700">
                  + Ingresos {formatMoney(hp.month.income, currency)}
                </p>
                <p className="text-red-600">
                  − Gastos {formatMoney(hp.month.expense, currency)}
                </p>
                {hp.month.interest !== 0 && (
                  <p className="text-slate-600">
                    + Rendimiento {formatMoney(hp.month.interest, currency)}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}

function compact(v: number, currency: Currency): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const sym = currency === "USD" ? "US$" : "$";
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${sym}${Math.round(abs / 1_000)}k`;
  return `${sign}${sym}${Math.round(abs)}`;
}
