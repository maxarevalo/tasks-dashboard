"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { currentPeriod, periodLabel, type Period } from "@/lib/period";
import { useAction } from "@/features/gastos/use-action";
import {
  createFixedExpense,
  updateFixedExpense,
} from "@/features/gastos/actions";
import type {
  CardDTO,
  FixedExpenseDTO,
  FixedFrequency,
} from "@/features/gastos/types";

const monthName = (p: Period) => {
  const [y, m] = p.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { month: "long" }).format(
    new Date(y, m - 1, 1),
  );
};

export function FixedForm({
  open,
  onClose,
  editing,
  cards,
  effectiveFrom,
}: {
  open: boolean;
  onClose: () => void;
  editing: FixedExpenseDTO | null;
  cards: CardDTO[];
  /** Al editar desde un mes puntual: mes por defecto para "aplicar desde". */
  effectiveFrom?: Period;
}) {
  const { pending, error, exec, setError } = useAction();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [category, setCategory] = useState<"fijo" | "prestamo">("fijo");
  const [cardId, setCardId] = useState("");
  const [startPeriod, setStartPeriod] = useState(currentPeriod());
  const [endPeriod, setEndPeriod] = useState("");
  const [frequency, setFrequency] = useState<FixedFrequency>("monthly");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [applyFrom, setApplyFrom] = useState(currentPeriod());

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}-${effectiveFrom ?? ""}`;
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
    setFrequency(editing?.frequency ?? "monthly");
    setAutoGenerate(editing ? editing.autoGenerate : true);
    setApplyFrom(effectiveFrom ?? currentPeriod());
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const base = {
      description,
      amount: Number(amount),
      currency,
      category,
      cardId: category === "prestamo" ? "" : cardId,
      startPeriod,
      endPeriod: endPeriod || "",
      frequency,
      autoGenerate,
    };

    if (editing) {
      exec(
        () =>
          updateFixedExpense(editing.id, {
            ...base,
            active: editing.active,
            // Propaga el cambio desde este mes en adelante.
            applyFrom,
          }),
        onClose,
      );
      return;
    }

    exec(
      () =>
        createFixedExpense({
          ...base,
          active: true,
          applyFrom: autoGenerate
            ? startPeriod > currentPeriod()
              ? startPeriod
              : currentPeriod()
            : "",
        }),
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
              <Select value={cardId} onChange={(e) => setCardId(e.target.value)}>
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

        <Field label="Frecuencia">
          <Select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as FixedFrequency)}
          >
            <option value="monthly">Mensual</option>
            <option value="annual">Anual</option>
          </Select>
        </Field>

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

        {frequency === "annual" && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Se va a cargar una vez al año, en {monthName(startPeriod)}
            {endPeriod ? ` (hasta ${endPeriod})` : ""}. El resto de los meses
            no aparece.
          </p>
        )}

        <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={autoGenerate}
            onChange={(e) => setAutoGenerate(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            Cargarlo automáticamente en el mes actual y en todos los siguientes.
            <span className="block text-xs text-slate-400">
              Si lo destildás, queda como plantilla y lo cargás a mano cada mes
              {frequency === "annual" ? " en que corresponda" : ""}.
            </span>
          </span>
        </label>

        {editing && (
          <Field
            label="Aplicar los cambios desde"
            hint={`Los meses anteriores a ${periodLabel(
              applyFrom,
            )} y los ya pagados no se tocan.`}
          >
            <Input
              type="month"
              value={applyFrom}
              onChange={(e) =>
                setApplyFrom(e.target.value || currentPeriod())
              }
            />
          </Field>
        )}

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
