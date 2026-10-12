import { addDays } from "@/lib/pf";
import {
  dateTimeLabel,
  formatGlucose,
  isFasting,
} from "@/features/salud/format";
import type { GlucoseEntryDTO } from "@/features/salud/types";

export function GlucoseStats({ entries }: { entries: GlucoseEntryDTO[] }) {
  if (entries.length === 0) return null;

  const latest = entries[0];
  const fasting = entries.filter((e) => isFasting(e.context));
  // Últimos 30 días contados desde la medición más reciente.
  const from = addDays(latest.takenAt.slice(0, 10), -29);
  const recentFasting = fasting.filter((e) => e.takenAt.slice(0, 10) >= from);
  const avg =
    recentFasting.length > 0
      ? recentFasting.reduce((s, e) => s + e.value, 0) / recentFasting.length
      : null;
  const inRange = recentFasting.filter((e) => e.value >= 70 && e.value <= 99).length;

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label="Última medición"
        value={formatGlucose(latest.value)}
        hint={`${latest.context} · ${dateTimeLabel(latest.takenAt)}`}
      />
      <Tile
        label="Promedio en ayunas (30 días)"
        value={avg != null ? formatGlucose(avg) : "—"}
        hint={
          avg != null
            ? `${recentFasting.length} ${recentFasting.length === 1 ? "medición" : "mediciones"}`
            : "Sin mediciones en ayunas"
        }
      />
      <Tile
        label="En ayunas entre 70 y 99"
        value={
          recentFasting.length > 0
            ? `${inRange} de ${recentFasting.length}`
            : "—"
        }
        hint="últimos 30 días"
      />
      <Tile
        label="Mediciones"
        value={String(entries.length)}
        hint={`${fasting.length} en ayunas`}
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
