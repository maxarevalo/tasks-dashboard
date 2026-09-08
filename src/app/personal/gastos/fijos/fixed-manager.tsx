"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { periodShortLabel, currentPeriod } from "@/lib/period";
import { useAction } from "@/features/gastos/use-action";
import {
  createFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
} from "@/features/gastos/actions";
import type { CardDTO, FixedExpenseDTO } from "@/features/gastos/types";

export function FixedManager({
  fixed,
  cards,
}: {
  fixed: FixedExpenseDTO[];
  cards: CardDTO[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpenseDTO | null>(null);
  const { exec } = useAction();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo gasto fijo
        </Button>
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Los gastos fijos son plantillas. Cada mes, desde la pantalla de gastos,
        confirmás con un botón que se carguen los del período.
      </p>

      {fixed.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Todavía no cargaste gastos fijos.
        </div>
      )}

      <ul className="space-y-2">
        {fixed.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-medium ${
                  f.active ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {f.description}
              </p>
              <p className="text-xs text-slate-500">
                {formatMoney(f.amount, f.currency)} {f.currency} ·{" "}
                {f.category === "prestamo" ? "Préstamo" : "Fijo"}
                {f.cardName ? ` · ${f.cardName}` : ""} · desde{" "}
                {periodShortLabel(f.startPeriod)}
                {f.endPeriod ? ` hasta ${periodShortLabel(f.endPeriod)}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                exec(() =>
                  updateFixedExpense(f.id, {
                    description: f.description,
                    amount: f.amount,
                    currency: f.currency,
                    category: f.category,
                    cardId: f.cardId ?? "",
                    startPeriod: f.startPeriod,
                    endPeriod: f.endPeriod ?? "",
                    active: !f.active,
                  }),
                )
              }
              className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 ${
                f.active ? "text-emerald-600" : "text-slate-300"
              }`}
              aria-label={f.active ? "Desactivar" : "Activar"}
            >
              <Power className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(f);
                setOpen(true);
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => exec(() => deleteFixedExpense(f.id))}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Borrar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <FixedForm
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        cards={cards}
      />
    </div>
  );
}

function FixedForm({
  open,
  onClose,
  editing,
  cards,
}: {
  open: boolean;
  onClose: () => void;
  editing: FixedExpenseDTO | null;
  cards: CardDTO[];
}) {
  const { pending, error, exec, setError } = useAction();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [category, setCategory] = useState<"fijo" | "prestamo">("fijo");
  const [cardId, setCardId] = useState("");
  const [startPeriod, setStartPeriod] = useState(currentPeriod());
  const [endPeriod, setEndPeriod] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setDescription(editing?.description ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setCurrency(editing?.currency ?? "ARS");
    setCategory(editing?.category ?? "fijo");
    setCardId(editing?.cardId ?? "");
    setStartPeriod(editing?.startPeriod ?? currentPeriod());
    setEndPeriod(editing?.endPeriod ?? "");
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      description,
      amount: Number(amount),
      currency,
      category,
      cardId: category === "prestamo" ? "" : cardId,
      startPeriod,
      endPeriod: endPeriod || "",
      active: editing?.active ?? true,
    };
    exec(
      () =>
        editing
          ? updateFixedExpense(editing.id, payload)
          : createFixedExpense(payload),
      onClose,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar gasto fijo" : "Nuevo gasto fijo"}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Descripción">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Alquiler, Spotify, Cuota del auto…"
            required
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
          <Field label="Moneda">
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "ARS" | "USD")}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "fijo" | "prestamo")
              }
            >
              <option value="fijo">Gasto fijo</option>
              <option value="prestamo">Préstamo</option>
            </Select>
          </Field>
          {category === "fijo" && (
            <Field label="Tarjeta" hint="Opcional">
              <Select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
              >
                <option value="">Sin tarjeta</option>
                {cards
                  .filter((c) => !c.archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Desde">
            <Input
              type="month"
              value={startPeriod}
              onChange={(e) =>
                setStartPeriod(e.target.value || currentPeriod())
              }
            />
          </Field>
          <Field label="Hasta" hint="Vacío = indefinido">
            <Input
              type="month"
              value={endPeriod}
              onChange={(e) => setEndPeriod(e.target.value)}
            />
          </Field>
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
