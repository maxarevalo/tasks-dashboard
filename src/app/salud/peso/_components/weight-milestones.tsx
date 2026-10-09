"use client";

import { useEffect, useState } from "react";
import { Flag, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Button, ErrorText } from "@/components/ui";
import { todayStr } from "@/lib/pf";
import { useAction } from "@/features/salud/use-action";
import {
  createWeightMilestone,
  updateWeightMilestone,
  deleteWeightMilestone,
} from "@/features/salud/actions";
import { dayLabel } from "@/features/salud/format";
import type { WeightMilestoneDTO } from "@/features/salud/types";

/** Ideas para completar rápido; se puede escribir cualquier otro texto. */
const SUGGESTIONS = [
  "Inicio de gym",
  "Comienzo de dieta",
  "Viaje",
  "Vacaciones",
  "Fiestas",
  "Lesión",
  "Cambio de medicación",
];

/** Hitos con fecha (viaje, inicio de gym, dieta…) que se marcan en el gráfico. */
export function WeightMilestones({
  milestones,
}: {
  milestones: WeightMilestoneDTO[];
}) {
  const { pending, error, exec } = useAction();
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<WeightMilestoneDTO | null>(null);

  // La fecha de hoy se toma en el navegador (no en el servidor) para que sea la local.
  useEffect(() => {
    setDate(todayStr()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    exec(
      () => createWeightMilestone({ date, label }),
      () => setLabel(""),
    );
  }

  // Del más reciente al más antiguo.
  const list = [...milestones].reverse();

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <Flag className="h-4 w-4 text-violet-600" />
          Hitos
        </h3>
        <p className="text-xs text-slate-400">
          Marcá cosas que pasaron (un viaje, empezar el gym, una dieta) para verlas
          en el gráfico.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
      >
        <Field label="Fecha">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Hito">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            list="weight-milestone-suggestions"
            maxLength={60}
            placeholder="Ej: Inicio de gym"
            required
          />
        </Field>
        <Button type="submit" disabled={pending || !date || !label.trim()}>
          <Plus className="h-4 w-4" />
          {pending ? "Guardando…" : "Agregar"}
        </Button>
        <datalist id="weight-milestone-suggestions">
          {SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </form>
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}

      {list.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {list.map((m) => (
            <MilestoneRow key={m.id} milestone={m} onEdit={() => setEditing(m)} />
          ))}
        </ul>
      )}

      <EditMilestoneModal milestone={editing} onClose={() => setEditing(null)} />
    </section>
  );
}

function MilestoneRow({
  milestone: m,
  onEdit,
}: {
  milestone: WeightMilestoneDTO;
  onEdit: () => void;
}) {
  const { pending, exec } = useAction();
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span className="w-24 shrink-0 text-xs tabular-nums text-slate-500">
        {dayLabel(m.date)}
      </span>
      <span className="min-w-0 flex-1 break-words text-sm text-slate-800">
        {m.label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={`Editar hito ${m.label}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => exec(() => deleteWeightMilestone(m.id))}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Borrar hito ${m.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function EditMilestoneModal({
  milestone,
  onClose,
}: {
  milestone: WeightMilestoneDTO | null;
  onClose: () => void;
}) {
  const { pending, error, exec, setError } = useAction();
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  if (milestone && syncedFor !== milestone.id) {
    setSyncedFor(milestone.id);
    setError(null);
    setDate(milestone.date);
    setLabel(milestone.label);
  } else if (!milestone && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!milestone) return;
    exec(() => updateWeightMilestone(milestone.id, { date, label }), onClose);
  }

  return (
    <Modal open={milestone != null} onClose={onClose} title="Editar hito">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Fecha">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Hito">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            list="weight-milestone-suggestions"
            maxLength={60}
            required
            autoFocus
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || !label.trim()}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
