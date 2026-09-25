"use client";

import { useRef, useState } from "react";
import { formatMoney, type Currency } from "@/lib/money";
import { dateLabel, daysBetween, todayStr, type DateStr } from "@/lib/pf";
import type { PlazoFijoDTO } from "@/features/pf-dardo/types";

const W = 720;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

type EventKind =
  | "apertura"
  | "deposito"
  | "retiro"
  | "interes"
  | "renovacion"
  | "cierre";

type PfEvent = {
  date: DateStr;
  kind: EventKind;
  label: string;
  amount: number;
  /** true si es posterior a hoy (vencimiento estimado). */
  projected: boolean;
};

type Point = {
  date: DateStr;
  balance: number;
  events: PfEvent[];
};

const KIND_ORDER: Record<EventKind, number> = {
  interes: 0,
  cierre: 1,
  renovacion: 2,
  apertura: 3,
  deposito: 4,
  retiro: 5,
};

const KIND_COLOR: Record<EventKind, string> = {
  apertura: "#2563eb",
  renovacion: "#2563eb",
  deposito: "#16a34a",
  retiro: "#dc2626",
  interes: "#d97706",
  cierre: "#475569",
};

const LEGEND: { kind: EventKind; label: string }[] = [
  { kind: "apertura", label: "Apertura / renovación" },
  { kind: "deposito", label: "Depósito" },
  { kind: "retiro", label: "Retiro" },
  { kind: "interes", label: "Interés cobrado" },
];

/**
 * Arma la línea de tiempo de una moneda a partir de todos los plazos (activos
 * y renovados). El saldo es el capital más los intereses ya cobrados: un
 * plazo renovado "cobra" su interés al vencer y el sucesor arranca con ese
 * monto (si el capital de la renovación difiere, la diferencia se muestra
 * como un depósito/retiro en la renovación).
 */
function buildEvents(plazos: PlazoFijoDTO[], today: DateStr): PfEvent[] {
  const byId = new Map(plazos.map((p) => [p.id, p]));
  const successorOf = new Map(
    plazos.filter((p) => p.renewedFromId).map((p) => [p.renewedFromId!, p]),
  );
  const events: PfEvent[] = [];
  const push = (e: Omit<PfEvent, "projected">) =>
    events.push({ ...e, projected: e.date > today });
  const name = (p: PlazoFijoDTO) => p.description || "Plazo fijo";

  for (const p of plazos) {
    const pred = p.renewedFromId ? byId.get(p.renewedFromId) : undefined;
    if (pred) {
      push({
        date: p.startDate,
        kind: "renovacion",
        label: `Renovación · ${name(p)}`,
        amount: p.principal - pred.maturityAmount,
      });
    } else {
      push({
        date: p.startDate,
        kind: "apertura",
        label: `Apertura · ${name(p)}`,
        amount: p.principal,
      });
    }

    for (const m of p.movements) {
      push({
        date: m.date,
        kind: m.amount >= 0 ? "deposito" : "retiro",
        label: m.description || (m.amount >= 0 ? "Depósito" : "Retiro"),
        amount: m.amount,
      });
    }

    push({
      date: p.endDate,
      kind: "interes",
      label: p.renewed
        ? `Interés cobrado · ${name(p)}`
        : `Interés al vencimiento · ${name(p)}`,
      amount: p.earnedAmount,
    });

    // Renovado pero sin sucesor (se borró el ciclo nuevo): el dinero sale.
    if (p.renewed && !successorOf.has(p.id)) {
      push({
        date: p.endDate,
        kind: "cierre",
        label: `Cierre · ${name(p)}`,
        amount: -p.maturityAmount,
      });
    }
  }

  return events.sort((a, b) =>
    a.date !== b.date
      ? a.date < b.date
        ? -1
        : 1
      : KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
  );
}

function buildPoints(events: PfEvent[]): Point[] {
  const points: Point[] = [];
  let balance = 0;
  for (const e of events) {
    balance += e.amount;
    const last = points[points.length - 1];
    if (last && last.date === e.date) {
      last.balance = balance;
      last.events.push(e);
    } else {
      points.push({ date: e.date, balance, events: [e] });
    }
  }
  return points;
}

/** Color del marcador: el evento de mayor peso del día (una renovación sin ajuste cuenta). */
function pointColor(p: Point): string {
  const main = [...p.events].sort((a, b) => {
    const wa = a.kind === "renovacion" ? Infinity : Math.abs(a.amount);
    const wb = b.kind === "renovacion" ? Infinity : Math.abs(b.amount);
    return wb - wa;
  })[0];
  return KIND_COLOR[main.kind];
}

export function PfMovementsCharts({ plazos }: { plazos: PlazoFijoDTO[] }) {
  const currencies = (["ARS", "USD"] as Currency[]).filter((c) =>
    plazos.some((p) => p.currency === c),
  );
  if (currencies.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">
        Movimientos del plazo fijo
      </h3>
      <div
        className={`grid gap-4 ${currencies.length > 1 ? "xl:grid-cols-2" : ""}`}
      >
        {currencies.map((c) => (
          <PfMovementsChart
            key={c}
            currency={c}
            plazos={plazos.filter((p) => p.currency === c)}
          />
        ))}
      </div>
    </section>
  );
}

function PfMovementsChart({
  currency,
  plazos,
}: {
  currency: Currency;
  plazos: PlazoFijoDTO[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const today = todayStr();
  const points = buildPoints(buildEvents(plazos, today));
  if (points.length === 0) return null;

  const first = points[0].date;
  const lastDate = points[points.length - 1].date;
  const end = lastDate > today ? lastDate : today;
  const totalDays = Math.max(1, daysBetween(first, end));

  const values = points.map((p) => p.balance);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || Math.abs(rawMax) || 1;
  const min = Math.max(0, rawMin - span * 0.15);
  const max = rawMax + span * 0.15;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (d: DateStr) => PAD.left + (daysBetween(first, d) / totalDays) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

  // Línea escalonada desde la primera apertura (sube/baja en cada evento y se
  // extiende hasta el final),
  // sólida hasta hoy y punteada en lo estimado.
  const todayX = x(today);
  const vertices: [number, number][] = [];
  points.forEach((p, i) => {
    const px = x(p.date);
    if (i > 0) vertices.push([px, y(points[i - 1].balance)]);
    vertices.push([px, y(p.balance)]);
  });
  vertices.push([x(end), y(points[points.length - 1].balance)]);
  const { solid, dashed } = splitPath(vertices, todayX);

  const yTicks = [min, min + (max - min) / 2, max].map((v) => ({ v, y: y(v) }));
  const monthTicks = monthTicksBetween(first, end, 6);

  function onMove(e: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(x(p.date) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  }

  const hp = hover != null ? points[hover] : null;

  return (
    <figure className="rounded-xl border border-slate-200 bg-white p-4">
      <figcaption className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-900">
        Saldo en {currency}
        <span className="flex flex-wrap items-center gap-3 text-xs font-normal text-slate-500">
          {LEGEND.map((l) => (
            <span key={l.kind} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: KIND_COLOR[l.kind] }}
              />
              {l.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-[#0f766e]" />
            Estimado
          </span>
        </span>
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
          aria-label={`Movimientos del plazo fijo en ${currency}`}
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
                {axisLabel(t.v, max - min, currency)}
              </text>
            </g>
          ))}

          {monthTicks.map((d) => (
            <text
              key={d}
              x={x(d)}
              y={H - 8}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize={10}
            >
              {monthLabel(d)}
            </text>
          ))}

          {today >= first && today <= end && (
            <g>
              <line
                x1={todayX}
                x2={todayX}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="#cbd5e1"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={todayX}
                y={PAD.top - 4}
                textAnchor="middle"
                className="fill-slate-400"
                fontSize={10}
              >
                hoy
              </text>
            </g>
          )}

          {solid && (
            <path
              d={solid}
              fill="none"
              stroke="#0f766e"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
          {dashed && (
            <path
              d={dashed}
              fill="none"
              stroke="#0f766e"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinejoin="round"
            />
          )}

          {hp && (
            <line
              x1={x(hp.date)}
              x2={x(hp.date)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="#94a3b8"
              strokeWidth={1}
            />
          )}

          {points.map((p, i) => (
            <circle
              key={p.date}
              cx={x(p.date)}
              cy={y(p.balance)}
              r={hover === i ? 5.5 : 4}
              fill={p.date > today ? "#fff" : pointColor(p)}
              stroke={p.date > today ? pointColor(p) : "#fff"}
              strokeWidth={2}
            />
          ))}
        </svg>

        {hp && (
          <div
            className="pointer-events-none absolute z-10 min-w-48 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: `${(x(hp.date) / W) * 100}%`,
              top: 4,
              transform:
                x(hp.date) > W / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
            }}
          >
            <p className="font-semibold text-slate-900">
              {dateLabel(hp.date)}
              {hp.date > today && (
                <span className="ml-1.5 font-normal text-slate-400">
                  (estimado)
                </span>
              )}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {hp.events.map((e, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: KIND_COLOR[e.kind] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-600">
                    {e.label}
                  </span>
                  <span
                    className={`tabular-nums ${
                      e.amount < 0 ? "text-red-600" : "text-slate-900"
                    }`}
                  >
                    {e.amount === 0
                      ? "sin ajuste"
                      : `${e.amount > 0 ? "+" : "−"}${formatMoney(Math.abs(e.amount), currency)}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1 border-t border-slate-100 pt-1 font-medium text-slate-900">
              Saldo: {formatMoney(hp.balance, currency)}
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}

/**
 * Divide una polilínea en la coordenada `splitX`: lo que queda a la izquierda
 * (inclusive) va en `solid` y el resto en `dashed`. Los tramos que cruzan
 * `splitX` son horizontales (línea escalonada), así que el corte es exacto.
 */
function splitPath(vertices: [number, number][], splitX: number) {
  const toD = (vs: [number, number][]) =>
    vs.length < 2
      ? ""
      : vs.map(([vx, vy], i) => `${i === 0 ? "M" : "L"} ${vx} ${vy}`).join(" ");
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  vertices.forEach((v, i) => {
    if (v[0] <= splitX) {
      left.push(v);
      return;
    }
    const prev = vertices[i - 1];
    if (prev && prev[0] <= splitX && right.length === 0) {
      left.push([splitX, prev[1]]);
      right.push([splitX, prev[1]]);
    }
    right.push(v);
  });
  return { solid: toD(left), dashed: toD(right) };
}

/** Primeros de mes entre dos fechas, espaciados para que entren ~`count` etiquetas. */
function monthTicksBetween(from: DateStr, to: DateStr, count: number): DateStr[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const months = (ty - fy) * 12 + (tm - fm);
  const step = Math.max(1, Math.ceil(months / count));
  const ticks: DateStr[] = [];
  for (let i = 1; i <= months; i += step) {
    const d = new Date(fy, fm - 1 + i, 1);
    ticks.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
    );
  }
  return ticks;
}

function monthLabel(d: DateStr): string {
  const [y, m] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit" })
    .format(new Date(y, m - 1, 1))
    .replace(".", "");
}

/** Etiqueta del eje Y: abreviada salvo que el rango sea chico y se repitan. */
function axisLabel(v: number, range: number, currency: Currency): string {
  if (range * 20 >= Math.abs(v)) return compact(v, currency);
  const sym = currency === "USD" ? "US$" : "$";
  return `${sym}${Math.round(v).toLocaleString("es-AR")}`;
}

function compact(v: number, currency: Currency): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const sym = currency === "USD" ? "US$" : "$";
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${sym}${Math.round(abs / 1_000)}k`;
  return `${sign}${sym}${Math.round(abs)}`;
}
