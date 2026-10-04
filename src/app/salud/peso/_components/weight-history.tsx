"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Button, ErrorText } from "@/components/ui";
import { useAction } from "@/features/salud/use-action";
import {
  updateWeightEntry,
  deleteWeightEntry,
} from "@/features/salud/actions";
import {
  dateTimeLabel,
  formatKg,
  formatKgDelta,
} from "@/features/salud/format";
import type { WeightEntryDTO } from "@/features/salud/types";

const PAGE = 15;

export function WeightHistory({ entries }: { entries: WeightEntryDTO[] }) {
  const [editing, setEditing] = useState<WeightEntryDTO | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (entries.length === 0) return null;
  const visible = showAll ? entries : entries.slice(0, PAGE);
  // El año se muestra solo si difiere del de la medición más reciente.
  const latestYear = entries[0].takenAt.slice(0, 4);

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">Historial</h3>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {visible.map((e) => (
          <WeightRow
            key={e.id}
            entry={e}
            withYear={e.takenAt.slice(0, 4) !== latestYear}
            onEdit={() => setEditing(e)}
          />
        ))}
      </ul>
      {entries.length > PAGE && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-slate-500 underline-offset-2 hover:underline"
        >
          {showAll ? "Ver menos" : `Ver las ${entries.length} mediciones`}
        </button>
      )}
      <EditWeightModal entry={editing} onClose={() => setEditing(null)} />
    </section>
  );
}

function WeightRow({
  entry: e,
  withYear,
  onEdit,
}: {
  entry: WeightEntryDTO;
  withYear: boolean;
  onEdit: () => void;
}) {
  const { pending, exec } = useAction();
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1 text-sm text-slate-600">
        {dateTimeLabel(e.takenAt, withYear)}
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold tabular-nums text-slate-900">
          {formatKg(e.weight)}
        </span>
        {e.delta != null && (
          <span className="block text-[11px] tabular-nums text-slate-400">
            {formatKgDelta(e.delta)}
          </span>
        )}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => exec(() => deleteWeightEntry(e.id))}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Borrar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function EditWeightModal({
  entry,
  onClose,
}: {
  entry: WeightEntryDTO | null;
  onClose: () => void;
}) {
  const { pending, error, exec, setError } = useAction();
  const [takenAt, setTakenAt] = useState("");
  const [weight, setWeight] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  if (entry && syncedFor !== entry.id) {
    setSyncedFor(entry.id);
    setError(null);
    setTakenAt(entry.takenAt);
    setWeight(String(entry.weight));
  } else if (!entry && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!entry) return;
    exec(
      () => updateWeightEntry(entry.id, { takenAt, weight: Number(weight) }),
      onClose,
    );
  }

  return (
    <Modal open={entry != null} onClose={onClose} title="Editar medición">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Fecha y hora">
          <Input
            type="datetime-local"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
            required
          />
        </Field>
        <Field label="Peso (kg)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="400"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
