"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { addMonths, currentPeriod, periodShortLabel } from "@/lib/period";
import { useAction } from "@/features/contable/use-action";
import {
  createIncome,
  updateIncome,
  setIncomeActive,
  deleteIncome,
} from "@/features/contable/actions";
import type { IncomeDTO, RecurrenceFrequency } from "@/features/contable/types";

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  monthly: "mensual",
  semiannual: "cada 6 meses",
  annual: "anual",
};

const monthName = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { month: "long" }).format(
    new Date(y, m - 1, 1),
  );
};

const ORIGIN_SUGGESTIONS = [
  "Sueldo",
  "Freelance",
  "Alquiler",
  "Dividendos",
  "Venta",
  "Reintegro",
];

export function IncomeManager({ incomes }: { incomes: IncomeDTO[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeDTO | null>(null);
  const { exec } = useAction();

  const grouped = groupByOrigin(incomes);

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
          Nuevo ingreso
        </Button>
      </div>

      {incomes.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Todavía no cargaste ingresos.
        </div>
      )}

      {grouped.map(([origin, items]) => (
        <section key={origin}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {origin}
          </h3>
          <ul className="space-y-2">
            {items.map((inc) => (
              <li
                key={inc.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`flex items-center gap-2 text-sm font-medium ${
                      inc.active ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {inc.description}
                    {!inc.confirmed && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        posible
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatMoney(inc.amount, inc.currency)} {inc.currency} ·{" "}
                    {inc.kind === "recurring"
                      ? `${FREQUENCY_LABELS[inc.frequency]} desde ${periodShortLabel(
                          inc.startPeriod ?? currentPeriod(),
                        )}${
                          inc.endPeriod
                            ? ` hasta ${periodShortLabel(inc.endPeriod)}`
                            : ""
                        }`
                      : `único en ${periodShortLabel(inc.period ?? currentPeriod())}`}
                  </p>
                </div>
                {inc.kind === "recurring" && (
                  <button
                    type="button"
                    onClick={() =>
                      exec(() => setIncomeActive(inc.id, !inc.active))
                    }
                    className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 ${
                      inc.active ? "text-emerald-600" : "text-slate-300"
                    }`}
                    aria-label={inc.active ? "Pausar" : "Reactivar"}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(inc);
                    setOpen(true);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => exec(() => deleteIncome(inc.id))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Borrar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <IncomeForm open={open} onClose={() => setOpen(false)} editing={editing} />
      <datalist id="origin-suggestions">
        {ORIGIN_SUGGESTIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}

function groupByOrigin(incomes: IncomeDTO[]): [string, IncomeDTO[]][] {
  const map = new Map<string, IncomeDTO[]>();
  for (const inc of incomes) {
    const k = inc.origin || "Sin origen";
    map.set(k, [...(map.get(k) ?? []), inc]);
  }
  return [...map.entries()];
}

function IncomeForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: IncomeDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [kind, setKind] = useState<"recurring" | "oneoff">("recurring");
  const [period, setPeriod] = useState(currentPeriod());
  const [startPeriod, setStartPeriod] = useState(currentPeriod());
  const [endPeriod, setEndPeriod] = useState("");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [confirmed, setConfirmed] = useState(true);

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setDescription(editing?.description ?? "");
    setOrigin(editing?.origin ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setCurrency(editing?.currency ?? "ARS");
    setKind(editing?.kind ?? "recurring");
    setPeriod(editing?.period || currentPeriod());
    setStartPeriod(editing?.startPeriod || currentPeriod());
    setEndPeriod(editing?.endPeriod ?? "");
    setFrequency(editing?.frequency ?? "monthly");
    setConfirmed(editing?.confirmed ?? true);
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    exec(
      () => {
        const payload = {
          description,
          origin,
          amount: Number(amount),
          currency,
          kind,
          period: kind === "oneoff" ? period : "",
          startPeriod: kind === "recurring" ? startPeriod : "",
          endPeriod: kind === "recurring" ? endPeriod : "",
          frequency,
          confirmed,
          active: editing?.active ?? true,
        };
        return editing
          ? updateIncome(editing.id, payload)
          : createIncome(payload);
      },
      onClose,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar ingreso" : "Nuevo ingreso"}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Descripción">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Sueldo empresa, Proyecto X…"
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Origen">
            <Input
              list="origin-suggestions"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Sueldo, Freelance…"
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as "recurring" | "oneoff")
              }
            >
              <option value="recurring">Mensual</option>
              <option value="oneoff">Único</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto">
            <Input
              type="number"
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

        {kind === "oneoff" ? (
          <Field label="Mes">
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value || currentPeriod())}
            />
          </Field>
        ) : (
          <>
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

            <Field label="Frecuencia">
              <Select
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as RecurrenceFrequency)
                }
              >
                <option value="monthly">Mensual</option>
                <option value="semiannual">Semestral (ej. aguinaldo)</option>
                <option value="annual">Anual</option>
              </Select>
            </Field>

            {frequency === "semiannual" && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Se cobra cada 6 meses: en {monthName(startPeriod)} y en{" "}
                {monthName(addMonths(startPeriod, 6))}
                {endPeriod ? ` (hasta ${endPeriod})` : ""}. Por ejemplo, para
                el aguinaldo cargá el 50% del sueldo con inicio en junio.
              </p>
            )}

            {frequency === "annual" && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Se cobra una vez al año, en {monthName(startPeriod)}
                {endPeriod ? ` (hasta ${endPeriod})` : ""}.
              </p>
            )}
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Ingreso confirmado (destildá si es sólo una posibilidad)
        </label>

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
