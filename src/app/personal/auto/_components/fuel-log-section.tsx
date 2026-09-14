"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Fuel } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney, type Currency } from "@/lib/money";
import { dateLabel, todayStr } from "@/lib/pf";
import { useAction } from "@/features/auto/use-action";
import {
  createFuelLog,
  updateFuelLog,
  deleteFuelLog,
} from "@/features/auto/actions";
import type { FuelLogDTO } from "@/features/auto/types";

export function FuelLogSection({ logs }: { logs: FuelLogDTO[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FuelLogDTO | null>(null);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Fuel className="h-4 w-4" />
          Carga de combustible
        </h3>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nueva carga
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Todavía no cargaste combustible.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <th className="px-3 py-2 text-left font-medium">Patente</th>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-right font-medium">Km</th>
                <th className="px-3 py-2 text-right font-medium">Litros</th>
                <th className="px-3 py-2 text-right font-medium">Gasto</th>
                <th className="px-3 py-2 text-right font-medium">$/litro</th>
                <th className="px-3 py-2 text-right font-medium">Consumo</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <FuelLogRow
                  key={l.id}
                  log={l}
                  onEdit={() => {
                    setEditing(l);
                    setOpen(true);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FuelLogForm open={open} onClose={() => setOpen(false)} editing={editing} />
    </section>
  );
}

function FuelLogRow({
  log: l,
  onEdit,
}: {
  log: FuelLogDTO;
  onEdit: () => void;
}) {
  const { pending, exec } = useAction();
  const pricePerLiter = l.liters > 0 ? l.amount / l.liters : 0;

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">
        {l.plate}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
        {dateLabel(l.date)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
        {l.km.toLocaleString("es-AR")}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
        {l.liters.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-900">
        {formatMoney(l.amount, l.currency)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-500">
        {formatMoney(pricePerLiter, l.currency)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-500">
        {l.kmPerLiter != null ? `${l.kmPerLiter.toFixed(1)} km/l` : "—"}
      </td>
      <td className="whitespace-nowrap px-2 py-2">
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
            onClick={() => exec(() => deleteFuelLog(l.id))}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Borrar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function FuelLogForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: FuelLogDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [plate, setPlate] = useState("");
  const [date, setDate] = useState(todayStr());
  const [km, setKm] = useState("");
  const [liters, setLiters] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setPlate(editing?.plate ?? "");
    setDate(editing?.date ?? todayStr());
    setKm(editing ? String(editing.km) : "");
    setLiters(editing ? String(editing.liters) : "");
    setAmount(editing ? String(editing.amount) : "");
    setCurrency(editing?.currency ?? "ARS");
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      plate,
      date,
      km: Number(km),
      liters: Number(liters),
      amount: Number(amount),
      currency,
    };
    exec(
      () => (editing ? updateFuelLog(editing.id, payload) : createFuelLog(payload)),
      onClose,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar carga" : "Nueva carga de combustible"}
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
          <Field label="Kilometraje">
            <Input
              type="number"
              min="0"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Litros">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
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
