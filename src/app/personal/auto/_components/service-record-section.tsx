"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Textarea, Button, ErrorText } from "@/components/ui";
import { formatMoney, type Currency } from "@/lib/money";
import { dateLabel, todayStr } from "@/lib/pf";
import { useAction } from "@/features/auto/use-action";
import {
  createServiceRecord,
  updateServiceRecord,
  deleteServiceRecord,
} from "@/features/auto/actions";
import type { ServiceRecordDTO } from "@/features/auto/types";

export function ServiceRecordSection({
  records,
}: {
  records: ServiceRecordDTO[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRecordDTO | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ClipboardList className="h-4 w-4" />
          Registro de service
        </h3>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo registro
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Todavía no cargaste services.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {records.map((r) => (
            <ServiceRecordRow
              key={r.id}
              record={r}
              onEdit={() => {
                setEditing(r);
                setOpen(true);
              }}
            />
          ))}
        </ul>
      )}

      <ServiceRecordForm
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
      />
    </section>
  );
}

function ServiceRecordRow({
  record: r,
  onEdit,
}: {
  record: ServiceRecordDTO;
  onEdit: () => void;
}) {
  const { pending, exec } = useAction();

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">
          {r.plate} <span className="font-normal text-slate-500">· {r.description}</span>
        </p>
        <p className="text-xs text-slate-500">{dateLabel(r.date)}</p>
        {r.parts.length > 0 && (
          <p className="mt-0.5 flex flex-wrap gap-1">
            {r.parts.map((p, i) => (
              <span
                key={i}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
              >
                {p}
              </span>
            ))}
          </p>
        )}
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
        {formatMoney(r.amount, r.currency)}
      </p>
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
          onClick={() => exec(() => deleteServiceRecord(r.id))}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Borrar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function ServiceRecordForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: ServiceRecordDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [plate, setPlate] = useState("");
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [parts, setParts] = useState<string[]>([]);

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setPlate(editing?.plate ?? "");
    setDate(editing?.date ?? todayStr());
    setDescription(editing?.description ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setCurrency(editing?.currency ?? "ARS");
    setParts(editing?.parts ?? []);
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      plate,
      date,
      description,
      amount: Number(amount),
      currency,
      parts: parts.map((p) => p.trim()).filter(Boolean),
    };
    exec(
      () =>
        editing
          ? updateServiceRecord(editing.id, payload)
          : createServiceRecord(payload),
      onClose,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar service" : "Nuevo registro de service"}
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
          <Field label="Fecha">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayStr())}
              required
            />
          </Field>
          <Field label="Gasto">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Moneda">
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </Select>
        </Field>

        <Field label="Descripción">
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Service de los 20.000 km"
            required
          />
        </Field>

        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">
            Repuestos cambiados
          </p>
          {parts.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={p}
                onChange={(e) =>
                  setParts((ps) =>
                    ps.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
                placeholder="Ej: Filtro de aceite"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setParts((ps) => ps.filter((_, j) => j !== i))}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Quitar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setParts((ps) => [...ps, ""])}
            className="text-xs font-medium text-slate-700 underline underline-offset-2"
          >
            + Agregar repuesto
          </button>
        </div>

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
