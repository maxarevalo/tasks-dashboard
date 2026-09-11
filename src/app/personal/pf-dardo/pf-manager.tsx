"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney, CURRENCIES, type Currency } from "@/lib/money";
import {
  addDays,
  dateLabel,
  plazoFijoMaturityAmount,
  tnaToMonthlyPct,
  todayStr,
} from "@/lib/pf";
import { useAction } from "@/features/pf-dardo/use-action";
import {
  createPlazoFijo,
  updatePlazoFijo,
  deletePlazoFijo,
  createMovement,
  updateMovement,
  deleteMovement,
} from "@/features/pf-dardo/actions";
import type {
  PfOverview,
  PlazoFijoDTO,
  PfMovementDTO,
} from "@/features/pf-dardo/types";

const pct = (n: number) =>
  `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export function PfManager({ overview }: { overview: PfOverview }) {
  const { plazos, movements, totals } = overview;
  const [plazoOpen, setPlazoOpen] = useState(false);
  const [editingPlazo, setEditingPlazo] = useState<PlazoFijoDTO | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<PfMovementDTO | null>(
    null,
  );

  const currenciesWithData = CURRENCIES.filter(
    (c) =>
      totals[c].principal !== 0 ||
      totals[c].movementsNet !== 0 ||
      plazos.some((p) => p.currency === c) ||
      movements.some((m) => m.currency === c),
  );
  const shownCurrencies = currenciesWithData.length ? currenciesWithData : ["ARS" as Currency];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TotalCard
          title="Total invertido"
          currencies={shownCurrencies}
          getValue={(c) => totals[c].principal}
        />
        <TotalCard
          title="Total ganado (interés)"
          currencies={shownCurrencies}
          getValue={(c) => totals[c].earned}
        />
        <TotalCard
          title="Total al vencimiento"
          currencies={shownCurrencies}
          getValue={(c) => totals[c].maturity}
        />
        <TotalCard
          title="Monto simulado"
          hint="Total al vencimiento + ingresos − egresos"
          currencies={shownCurrencies}
          getValue={(c) => totals[c].simulatedMaturity}
          highlight
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Plazos fijos
          </h3>
          <Button
            onClick={() => {
              setEditingPlazo(null);
              setPlazoOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo plazo fijo
          </Button>
        </div>

        {plazos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Todavía no cargaste plazos fijos.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-max border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="px-3 py-2 text-left font-medium">
                    Descripción
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Desde</th>
                  <th className="px-3 py-2 text-left font-medium">Hasta</th>
                  <th className="px-3 py-2 text-right font-medium">Plazo</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Monto inicial
                  </th>
                  <th className="px-3 py-2 text-right font-medium">TNA</th>
                  <th className="px-3 py-2 text-right font-medium">
                    % mensual
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Monto ganado
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Monto al vencimiento
                  </th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {plazos.map((p) => (
                  <PlazoRow
                    key={p.id}
                    plazo={p}
                    onEdit={() => {
                      setEditingPlazo(p);
                      setPlazoOpen(true);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Ingresos y egresos
            </h3>
            <p className="text-xs text-slate-500">
              Movimientos sueltos (fuera de los plazos fijos) que ajustan el
              monto simulado.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setEditingMovement(null);
              setMovementOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo movimiento
          </Button>
        </div>

        {movements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Todavía no cargaste ingresos ni egresos.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {movements.map((m) => (
              <MovementRow
                key={m.id}
                movement={m}
                onEdit={() => {
                  setEditingMovement(m);
                  setMovementOpen(true);
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <PlazoForm
        open={plazoOpen}
        onClose={() => setPlazoOpen(false)}
        editing={editingPlazo}
      />
      <MovementForm
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        editing={editingMovement}
      />
    </div>
  );
}

function TotalCard({
  title,
  hint,
  currencies,
  getValue,
  highlight = false,
}: {
  title: string;
  hint?: string;
  currencies: Currency[];
  getValue: (c: Currency) => number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-xs font-medium ${
          highlight ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {title}
      </p>
      <div className="mt-1 space-y-0.5">
        {currencies.map((c) => (
          <p key={c} className="text-lg font-semibold tabular-nums">
            {formatMoney(getValue(c), c)}{" "}
            <span
              className={`text-xs font-normal ${
                highlight ? "text-slate-300" : "text-slate-400"
              }`}
            >
              {c}
            </span>
          </p>
        ))}
      </div>
      {hint && (
        <p
          className={`mt-1 text-[11px] ${
            highlight ? "text-slate-300" : "text-slate-400"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function PlazoRow({
  plazo: p,
  onEdit,
}: {
  plazo: PlazoFijoDTO;
  onEdit: () => void;
}) {
  const { pending, exec } = useAction();

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-3 py-2">
        <span className="text-slate-800">
          {p.description || "Plazo fijo"}
        </span>
        <span className="ml-1.5 text-xs text-slate-400">{p.currency}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
        {dateLabel(p.startDate)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
        {dateLabel(p.endDate)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right text-slate-600">
        {p.termDays} días
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-800">
        {formatMoney(p.principal, p.currency)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
        {pct(p.tna)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
        {pct(p.monthlyPct)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-emerald-600">
        +{formatMoney(p.earnedAmount, p.currency)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
        {formatMoney(p.maturityAmount, p.currency)}
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
            onClick={() => exec(() => deletePlazoFijo(p.id))}
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

function MovementRow({
  movement: m,
  onEdit,
}: {
  movement: PfMovementDTO;
  onEdit: () => void;
}) {
  const { pending, exec } = useAction();
  const isIngreso = m.amount >= 0;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          isIngreso
            ? "bg-emerald-100 text-emerald-600"
            : "bg-red-100 text-red-600"
        }`}
      >
        {isIngreso ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">
          {m.description}
        </p>
        <p className="text-xs text-slate-500">{dateLabel(m.date)}</p>
      </div>
      <p
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          isIngreso ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {isIngreso ? "+" : "-"}
        {formatMoney(Math.abs(m.amount), m.currency)}
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
          onClick={() => exec(() => deleteMovement(m.id))}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Borrar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function PlazoForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: PlazoFijoDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [startDate, setStartDate] = useState(todayStr());
  const [termDays, setTermDays] = useState("30");
  const [principal, setPrincipal] = useState("");
  const [tna, setTna] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setDescription(editing?.description ?? "");
    setCurrency(editing?.currency ?? "ARS");
    setStartDate(editing?.startDate ?? todayStr());
    setTermDays(editing ? String(editing.termDays) : "30");
    setPrincipal(editing ? String(editing.principal) : "");
    setTna(editing ? String(editing.tna) : "");
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  const preview = useMemo(() => {
    const days = Number(termDays) || 0;
    const p = Number(principal) || 0;
    const rate = Number(tna) || 0;
    if (days <= 0 || p <= 0) return null;
    const maturity = plazoFijoMaturityAmount(p, rate, days);
    return {
      endDate: addDays(startDate, days),
      maturity,
      earned: maturity - p,
      monthlyPct: tnaToMonthlyPct(rate),
    };
  }, [startDate, termDays, principal, tna]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      description,
      currency,
      startDate,
      termDays: Number(termDays),
      principal: Number(principal),
      tna: Number(tna),
    };
    exec(
      () =>
        editing
          ? updatePlazoFijo(editing.id, payload)
          : createPlazoFijo(payload),
      onClose,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar plazo fijo" : "Nuevo plazo fijo"}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Descripción" hint="Opcional, ej: Banco Galicia">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Banco Galicia"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Moneda">
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field label="Fecha desde">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value || todayStr())}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Plazo (días)">
            <Input
              type="number"
              min="1"
              value={termDays}
              onChange={(e) => setTermDays(e.target.value)}
              required
            />
          </Field>
          <Field label="TNA (%)" hint="Ej: 40 para 40%">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={tna}
              onChange={(e) => setTna(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Monto inicial">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            required
          />
        </Field>

        {preview && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span>Hasta: {dateLabel(preview.endDate)}</span>
            <span>% mensual: {pct(preview.monthlyPct)}</span>
            <span>Monto ganado: {formatMoney(preview.earned, currency)}</span>
            <span className="font-semibold text-slate-900">
              Al vencimiento: {formatMoney(preview.maturity, currency)}
            </span>
          </div>
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

function MovementForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: PfMovementDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [kind, setKind] = useState<"ingreso" | "egreso">("ingreso");
  const [amount, setAmount] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setDate(editing?.date ?? todayStr());
    setDescription(editing?.description ?? "");
    setCurrency(editing?.currency ?? "ARS");
    setKind(editing && editing.amount < 0 ? "egreso" : "ingreso");
    setAmount(editing ? String(Math.abs(editing.amount)) : "");
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const signed = Math.abs(Number(amount)) * (kind === "egreso" ? -1 : 1);
    const payload = { date, description, currency, amount: signed };
    exec(
      () =>
        editing
          ? updateMovement(editing.id, payload)
          : createMovement(payload),
      onClose,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar movimiento" : "Nuevo movimiento"}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Descripción">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Retiro para gastos, Aporte extra…"
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as "ingreso" | "egreso")
              }
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </Select>
          </Field>
          <Field label="Fecha">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayStr())}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
          <Field label="Moneda">
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
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
