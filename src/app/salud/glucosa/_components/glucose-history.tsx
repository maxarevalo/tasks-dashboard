"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Button, ErrorText } from "@/components/ui";
import { useAction } from "@/features/salud/use-action";
import {
  updateGlucoseEntry,
  deleteGlucoseEntry,
} from "@/features/salud/actions";
import { dateTimeLabel, formatGlucose } from "@/features/salud/format";
import type { GlucoseEntryDTO } from "@/features/salud/types";

const PAGE = 15;

export function GlucoseHistory({ entries }: { entries: GlucoseEntryDTO[] }) {
  const [editing, setEditing] = useState<GlucoseEntryDTO | null>(null);
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
          <GlucoseRow
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
      <EditGlucoseModal entry={editing} onClose={() => setEditing(null)} />
    </section>
  );
}

function GlucoseRow({
  entry: e,
  withYear,
  onEdit,
}: {
  entry: GlucoseEntryDTO;
  withYear: boolean;
  onEdit: () => void;
}) {
  const { pending, exec } = useAction();
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-slate-600">
          {dateTimeLabel(e.takenAt, withYear)}
        </span>
        <span className="block truncate text-xs text-slate-500">{e.context}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
        {formatGlucose(e.value)}
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
          onClick={() => exec(() => deleteGlucoseEntry(e.id))}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Borrar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function EditGlucoseModal({
  entry,
  onClose,
}: {
  entry: GlucoseEntryDTO | null;
  onClose: () => void;
}) {
  const { pending, error, exec, setError } = useAction();
  const [takenAt, setTakenAt] = useState("");
  const [value, setValue] = useState("");
  const [context, setContext] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  if (entry && syncedFor !== entry.id) {
    setSyncedFor(entry.id);
    setError(null);
    setTakenAt(entry.takenAt);
    setValue(String(entry.value));
    setContext(entry.context);
  } else if (!entry && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!entry) return;
    exec(
      () => updateGlucoseEntry(entry.id, { takenAt, value: Number(value), context }),
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
        <Field label="Glucosa (mg/dL)">
          <Input
            type="number"
            inputMode="numeric"
            step="1"
            min="20"
            max="600"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label="Descripción">
          <Input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            list="glucose-contexts"
            maxLength={60}
            placeholder="Ayunas"
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
