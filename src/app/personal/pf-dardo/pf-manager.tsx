"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw, ArrowLeftRight } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { RowMenu, type RowMenuItem } from "@/components/row-menu";
import { formatMoney, type Currency } from "@/lib/money";
import {
  addDays,
  computePlazoFijoResult,
  dateLabel,
  tnaToMonthlyPct,
  todayStr,
} from "@/lib/pf";
import { useAction } from "@/features/pf-dardo/use-action";
import {
  createPlazoFijo,
  updatePlazoFijo,
  deletePlazoFijo,
  renewPlazoFijo,
  addPlazoMovement,
  updatePlazoMovement,
  deletePlazoMovement,
} from "@/features/pf-dardo/actions";
import type {
  PfOverview,
  PlazoFijoDTO,
  PfMovementDTO,
} from "@/features/pf-dardo/types";

const pct = (n: number) =>
  `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export function PfManager({ overview }: { overview: PfOverview }) {
  const { active, history, totals } = overview;
  const [plazoOpen, setPlazoOpen] = useState(false);
  const [editingPlazo, setEditingPlazo] = useState<PlazoFijoDTO | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewSource, setRenewSource] = useState<PlazoFijoDTO | null>(null);
  const [movementsForId, setMovementsForId] = useState<string | null>(null);
  const movementsFor = active.find((p) => p.id === movementsForId) ?? null;

  const currencies: Currency[] = ["ARS", "USD"];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TotalCard
          title="Total invertido"
          currencies={currencies}
          getValue={(c) => totals[c].principal}
        />
        <TotalCard
          title="Movimientos netos"
          hint="Depósitos − retiros durante el plazo"
          currencies={currencies}
          getValue={(c) => totals[c].movementsNet}
        />
        <TotalCard
          title="Total ganado (interés real)"
          currencies={currencies}
          getValue={(c) => totals[c].earned}
        />
        <TotalCard
          title="Total al vencimiento"
          hint="Ya incluye depósitos y retiros"
          currencies={currencies}
          getValue={(c) => totals[c].maturity}
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

        {active.length === 0 ? (
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
                  <th className="px-3 py-2 text-center font-medium">
                    Movimientos
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
                {active.map((p) => (
                  <PlazoRow
                    key={p.id}
                    plazo={p}
                    onEdit={() => {
                      setEditingPlazo(p);
                      setPlazoOpen(true);
                    }}
                    onRenew={() => {
                      setRenewSource(p);
                      setRenewOpen(true);
                    }}
                    onMovements={() => setMovementsForId(p.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-2">
          <details className="rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-700">
              Historial de renovaciones ({history.length})
            </summary>
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {history.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 text-slate-400"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p.description || "Plazo fijo"}
                      <span className="ml-1.5 text-xs">{p.currency}</span>
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                        Renovado
                      </span>
                    </p>
                    <p className="text-xs">
                      {dateLabel(p.startDate)} – {dateLabel(p.endDate)} ·
                      cerró en {formatMoney(p.maturityAmount, p.currency)}
                    </p>
                  </div>
                  <PlazoFijoDelete id={p.id} />
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      <PlazoForm
        open={plazoOpen}
        onClose={() => setPlazoOpen(false)}
        editing={editingPlazo}
      />
      <RenewForm
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        source={renewSource}
      />
      <MovementsModal
        open={movementsForId != null}
        onClose={() => setMovementsForId(null)}
        plazo={movementsFor}
      />
    </div>
  );
}

function PlazoFijoDelete({ id }: { id: string }) {
  const { pending, exec } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => exec(() => deletePlazoFijo(id))}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600"
      aria-label="Borrar"
    >
      <Trash2 className="h-4 w-4" />
    </button>
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
  onRenew,
  onMovements,
}: {
  plazo: PlazoFijoDTO;
  onEdit: () => void;
  onRenew: () => void;
  onMovements: () => void;
}) {
  const { pending, exec } = useAction();

  const menuItems: RowMenuItem[] = [
    {
      label: "Editar",
      icon: <Pencil className="h-3.5 w-3.5" />,
      onClick: onEdit,
    },
    {
      label: "Renovar",
      icon: <RefreshCw className="h-3.5 w-3.5" />,
      onClick: onRenew,
    },
    {
      label: "Borrar",
      icon: <Trash2 className="h-3.5 w-3.5" />,
      danger: true,
      onClick: () => exec(() => deletePlazoFijo(p.id)),
    },
  ];

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
      <td className="whitespace-nowrap px-3 py-2 text-center">
        <button
          type="button"
          onClick={onMovements}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeftRight className="h-3 w-3" />
          {p.movements.length}
          {p.movementsNet !== 0 && (
            <span
              className={p.movementsNet > 0 ? "text-emerald-600" : "text-red-600"}
            >
              ({p.movementsNet > 0 ? "+" : ""}
              {formatMoney(p.movementsNet, p.currency)})
            </span>
          )}
        </button>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-emerald-600">
        +{formatMoney(p.earnedAmount, p.currency)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-slate-900">
        {formatMoney(p.maturityAmount, p.currency)}
      </td>
      <td className="whitespace-nowrap px-2 py-2">
        <RowMenu items={menuItems} />
        {pending && <span className="sr-only">Guardando…</span>}
      </td>
    </tr>
  );
}

function MovementsModal({
  open,
  onClose,
  plazo,
}: {
  open: boolean;
  onClose: () => void;
  plazo: PlazoFijoDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"deposito" | "retiro">("deposito");
  const [amount, setAmount] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${plazo?.id ?? ""}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setEditingId(null);
    setDate(plazo?.startDate ?? todayStr());
    setDescription("");
    setKind("deposito");
    setAmount("");
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function startEdit(m: PfMovementDTO) {
    setEditingId(m.id);
    setDate(m.date);
    setDescription(m.description);
    setKind(m.amount < 0 ? "retiro" : "deposito");
    setAmount(String(Math.abs(m.amount)));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDate(plazo?.startDate ?? todayStr());
    setDescription("");
    setKind("deposito");
    setAmount("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!plazo) return;
    const signed = Math.abs(Number(amount)) * (kind === "retiro" ? -1 : 1);
    const payload = { date, description, amount: signed };
    exec(
      () =>
        editingId
          ? updatePlazoMovement(plazo.id, editingId, payload)
          : addPlazoMovement(plazo.id, payload),
      cancelEdit,
    );
  }

  if (!plazo) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Movimientos: ${plazo.description || "Plazo fijo"}`}
      size="lg"
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {dateLabel(plazo.startDate)} – {dateLabel(plazo.endDate)} · capital
          inicial {formatMoney(plazo.principal, plazo.currency)} · monto real
          al vencimiento{" "}
          <span className="font-semibold text-slate-900">
            {formatMoney(plazo.maturityAmount, plazo.currency)}
          </span>
        </p>

        {plazo.movements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            Todavía no hay depósitos ni retiros en este plazo.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {[...plazo.movements]
              .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
              .map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">
                      {m.description || (m.amount < 0 ? "Retiro" : "Depósito")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {dateLabel(m.date)}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      m.amount < 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {m.amount < 0 ? "-" : "+"}
                    {formatMoney(Math.abs(m.amount), plazo.currency)}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(m)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Editar movimiento"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        exec(() => deletePlazoMovement(plazo.id, m.id))
                      }
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Borrar movimiento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}

        <form
          onSubmit={submit}
          className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <p className="text-xs font-semibold text-slate-600">
            {editingId ? "Editar movimiento" : "Nuevo movimiento"}
          </p>
          <Field label="Descripción" hint="Opcional">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Retiro para gastos, Aporte extra…"
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Tipo">
              <Select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "deposito" | "retiro")
                }
              >
                <option value="deposito">Depósito</option>
                <option value="retiro">Retiro</option>
              </Select>
            </Field>
            <Field
              label="Fecha"
              hint={`${dateLabel(plazo.startDate)}–${dateLabel(plazo.endDate)}`}
            >
              <Input
                type="date"
                min={plazo.startDate}
                max={plazo.endDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
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
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end gap-2">
            {editingId && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancelar edición
              </Button>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : editingId ? "Guardar" : "Agregar"}
            </Button>
          </div>
        </form>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
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
    const endDate = addDays(startDate, days);
    const result = computePlazoFijoResult(p, rate, startDate, endDate, []);
    return {
      endDate,
      maturity: result.finalAmount,
      earned: result.totalInterest,
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

function RenewForm({
  open,
  onClose,
  source,
}: {
  open: boolean;
  onClose: () => void;
  source: PlazoFijoDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [termDays, setTermDays] = useState("30");
  const [principal, setPrincipal] = useState("");
  const [tna, setTna] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${source?.id ?? ""}`;
  if (open && syncedFor !== key && source) {
    setSyncedFor(key);
    setError(null);
    setDescription(source.description);
    setStartDate(source.endDate);
    setTermDays(String(source.termDays));
    setPrincipal(String(Math.round(source.maturityAmount * 100) / 100));
    setTna(String(source.tna));
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  const preview = useMemo(() => {
    if (!source) return null;
    const days = Number(termDays) || 0;
    const p = Number(principal) || 0;
    const rate = Number(tna) || 0;
    if (days <= 0 || p <= 0) return null;
    const endDate = addDays(startDate, days);
    const result = computePlazoFijoResult(p, rate, startDate, endDate, []);
    return {
      endDate,
      maturity: result.finalAmount,
      earned: result.totalInterest,
      monthlyPct: tnaToMonthlyPct(rate),
    };
  }, [source, startDate, termDays, principal, tna]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!source) return;
    const payload = {
      description,
      currency: source.currency,
      startDate,
      termDays: Number(termDays),
      principal: Number(principal),
      tna: Number(tna),
    };
    exec(() => renewPlazoFijo(source.id, payload), onClose);
  }

  if (!source) return null;

  return (
    <Modal open={open} onClose={onClose} title="Renovar plazo fijo">
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Se cierra <strong>{source.description || "este plazo fijo"}</strong>{" "}
          con un monto real de{" "}
          {formatMoney(source.maturityAmount, source.currency)} al{" "}
          {dateLabel(source.endDate)}, y arranca un ciclo nuevo con esos datos
          (podés ajustar tasa, plazo y monto).
        </p>

        <Field label="Descripción" hint="Opcional">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha desde">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value || todayStr())}
              required
            />
          </Field>
          <Field label="Plazo (días)">
            <Input
              type="number"
              min="1"
              value={termDays}
              onChange={(e) => setTermDays(e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="TNA (%)" hint="Podés cambiarla">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={tna}
              onChange={(e) => setTna(e.target.value)}
              required
            />
          </Field>
          <Field label="Monto inicial" hint={`Moneda: ${source.currency}`}>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              required
            />
          </Field>
        </div>

        {preview && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span>Hasta: {dateLabel(preview.endDate)}</span>
            <span>% mensual: {pct(preview.monthlyPct)}</span>
            <span>
              Monto ganado: {formatMoney(preview.earned, source.currency)}
            </span>
            <span className="font-semibold text-slate-900">
              Al vencimiento:{" "}
              {formatMoney(preview.maturity, source.currency)}
            </span>
          </div>
        )}

        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Renovar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
