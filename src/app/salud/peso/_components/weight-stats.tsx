import { addDays, daysBetween } from "@/lib/pf";
import {
  dateTimeLabel,
  formatKg,
  formatKgDelta,
  shortDay,
  weekRangeLabel,
} from "@/features/salud/format";
import type { WeightOverview } from "@/features/salud/types";

/**
 * Ritmo semanal: cambio del promedio entre la última semana y la semana con
 * datos más reciente de hace al menos 4 semanas (o la primera), dividido por
 * las semanas que pasaron.
 */
function weeklyRate(weeks: WeightOverview["weeks"]): number | null {
  if (weeks.length < 2) return null;
  const last = weeks[weeks.length - 1];
  const cutoff = addDays(last.start, -28);
  const ref =
    [...weeks].reverse().find((w) => w.start <= cutoff) ?? weeks[0];
  const span = daysBetween(ref.start, last.start) / 7;
  return span > 0 ? (last.avg - ref.avg) / span : null;
}

export function WeightStats({ overview }: { overview: WeightOverview }) {
  const { entries, weeks } = overview;
  if (entries.length === 0) return null;

  const latest = entries[0];
  const first = entries[entries.length - 1];
  const lastWeek = weeks[weeks.length - 1];
  const rate = weeklyRate(weeks);

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Peso actual"
        value={formatKg(latest.weight)}
        hint={dateTimeLabel(latest.takenAt)}
      />
      <Tile
        label="Promedio última semana"
        value={formatKg(lastWeek.avg)}
        hint={
          lastWeek.delta != null
            ? `${formatKgDelta(lastWeek.delta)} vs semana anterior`
            : weekRangeLabel(lastWeek.start, lastWeek.end)
        }
      />
      <Tile
        label="Ritmo (últimas 4 semanas)"
        value={rate != null ? `${formatKgDelta(rate)}` : "—"}
        hint={rate != null ? "por semana, en promedio" : "Hacen falta 2 semanas con datos"}
      />
      <Tile
        label="Cambio total"
        value={formatKgDelta(latest.weight - first.weight)}
        hint={`desde ${shortDay(first.takenAt.slice(0, 10))} ${first.takenAt.slice(0, 4)}`}
      />
    </section>
  );
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>
    </div>
  );
}
