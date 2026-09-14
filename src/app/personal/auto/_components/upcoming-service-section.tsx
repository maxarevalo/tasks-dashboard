"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Wrench, AlertTriangle, Clock } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Textarea, Button, ErrorText } from "@/components/ui";
import { dateLabel, todayStr } from "@/lib/pf";
import { useAction } from "@/features/auto/use-action";
import {
  createUpcomingService,
  updateUpcomingService,
  deleteUpcomingService,
} from "@/features/auto/actions";
import type { UpcomingServiceDTO } from "@/features/auto/types";

const STATUS_STYLES: Record<
  UpcomingServiceDTO["status"],
  { bg: string; text: string; label: string }
> = {
  overdue: { bg: "bg-red-100", text: "text-red-700", label: "Vencido" },
  soon: { bg: "bg-amber-100", text: "text-amber-700", label: "Próximo" },
  ok: { bg: "bg-slate-100", text: "text-slate-500", label: "Programado" },
};

export function UpcomingServiceSection({
  items,
}: {
  items: UpcomingServiceDTO[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UpcomingServiceDTO | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Wrench className="h-4 w-4" />
          Próximos services
        </h3>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo próximo service
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No tenés services programados.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((u) => (
            <UpcomingRow
              key={u.id}
              item={u}
              onEdit={() => {
                setEditing(u);
                setOpen(true);
              }}
            />
          ))}
        </ul>
      )}

      <UpcomingServiceForm
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
      />
    </section>
  );
}

function UpcomingRow({
  item: u,
  onEdit,
}: {
  item: UpcomingServiceDTO;
  onEdit: () => void;
}) {
  const { pending, exec } = useAction();
  const s = STATUS_STYLES[u.status];

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${s.bg} ${s.text}`}>
        {u.status === "overdue" ? (
          <AlertTriangle className="h-4 w-4" />
        ) : u.status === "soon" ? (
          <Clock className="h-4 w-4" />
        ) : (
          <Wrench className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
          {u.plate}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${s.bg} ${s.text}`}>
            {s.label}
          </span>
        </p>
        <p className="text-xs text-slate-500">
          Próximo service: {dateLabel(u.nextServiceDate)} · cargado el{" "}
          {dateLabel(u.loadedDate)}
          {u.mechanic ? ` · ${u.mechanic}` : ""}
        </p>
        {u.description && (
          <p className="mt-0.5 text-xs text-slate-400">{u.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
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
          onClick={() => exec(() => deleteUpcomingService(u.id))}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Borrar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function UpcomingServiceForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: UpcomingServiceDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [plate, setPlate] = useState("");
  const [loadedDate, setLoadedDate] = useState(todayStr());
  const [nextServiceDate, setNextServiceDate] = useState(todayStr());
  const [description, setDescription] = useState("");
  const [mechanic, setMechanic] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setPlate(editing?.plate ?? "");
    setLoadedDate(editing?.loadedDate ?? todayStr());
    setNextServiceDate(editing?.nextServiceDate ?? todayStr());
    setDescription(editing?.description ?? "");
    setMechanic(editing?.mechanic ?? "");
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { plate, loadedDate, nextServiceDate, description, mechanic };
    exec(
      () =>
        editing
          ? updateUpcomingService(editing.id, payload)
          : createUpcomingService(payload),
      onClose,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar próximo service" : "Nuevo próximo service"}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Patente">
          <Input
            list="auto-plates"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="Ej: AB123CD"
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de carga">
            <Input
              type="date"
              value={loadedDate}
              onChange={(e) => setLoadedDate(e.target.value || todayStr())}
              required
            />
          </Field>
          <Field label="Fecha de próximo service">
            <Input
              type="date"
              value={nextServiceDate}
              onChange={(e) => setNextServiceDate(e.target.value || todayStr())}
              required
            />
          </Field>
        </div>

        <Field label="Mecánico" hint="Opcional">
          <Input
            value={mechanic}
            onChange={(e) => setMechanic(e.target.value)}
            placeholder="Ej: Taller Gómez"
          />
        </Field>

        <Field label="Descripción" hint="Opcional">
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Cambio de correa de distribución"
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
