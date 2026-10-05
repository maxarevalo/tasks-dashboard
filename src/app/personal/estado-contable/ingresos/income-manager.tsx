"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Power, HandCoins, Undo2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import {
  addMonths,
  currentPeriod,
  periodMatchesCadence,
  periodShortLabel,
  type Period,
} from "@/lib/period";
import { useAction } from "@/features/contable/use-action";
import {
  createIncome,
  updateIncome,
  setIncomeActive,
  deleteIncome,
  undoIncomeReceipt,
} from "@/features/contable/actions";
import type {
  IncomeDTO,
  RecurrenceFrequency,
  SavingsAccountDTO,
} from "@/features/contable/types";
import { dateLabel } from "@/lib/pf";
import { ReceiveDialog } from "./receive-dialog";
import { useClearActionParam } from "@/lib/use-clear-action";

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

/** true si el ingreso corresponde a ese mes (según su tipo, vigencia y frecuencia). */
function appliesTo(inc: IncomeDTO, p: Period): boolean {
  if (!inc.active) return false;
  if (inc.kind === "oneoff") return inc.period === p;
  if (!inc.startPeriod || p < inc.startPeriod) return false;
  if (inc.endPeriod && p > inc.endPeriod) return false;
  return periodMatchesCadence(inc.startPeriod, p, inc.frequency);
}

/** Mes sugerido para cobrar: el actual si corresponde, si no el próximo que corresponda sin cobrar. */
function suggestedPeriod(inc: IncomeDTO, now: Period): Period {
  for (let i = 0; i < 13; i++) {
    const p = addMonths(now, i);
    if (appliesTo(inc, p) && !inc.receipts.some((r) => r.period === p)) return p;
  }
  return inc.kind === "oneoff" && inc.period ? inc.period : now;
}

export function IncomeManager({
  incomes,
  accounts,
  initialAction,
}: {
  incomes: IncomeDTO[];
  accounts: SavingsAccountDTO[];
  /** Acceso directo: abre "Nuevo ingreso" o "Cobrar" al entrar. */
  initialAction?: "cargar" | "cobrar";
}) {
  useClearActionParam(initialAction);
  const now = currentPeriod();
  // Ingresos que corresponden a este mes y todavía no se cobraron.
  const pendingNow = incomes.filter(
    (inc) => appliesTo(inc, now) && !inc.receipts.some((r) => r.period === now),
  );
  const [open, setOpen] = useState(initialAction === "cargar");
  const [editing, setEditing] = useState<IncomeDTO | null>(null);
  const [receiving, setReceiving] = useState<{
    income: IncomeDTO;
    period: Period;
  } | null>(() =>
    initialAction === "cobrar" && pendingNow.length === 1
      ? { income: pendingNow[0], period: now }
      : null,
  );
  // Con varios (o ningún) ingreso por cobrar, primero se elige cuál.
  const [picking, setPicking] = useState(
    initialAction === "cobrar" && pendingNow.length !== 1,
  );
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
                  <ReceiptStatus
                    income={inc}
                    now={now}
                    onUndo={(id) => exec(() => undoIncomeReceipt(id))}
                  />
                </div>
                {inc.active && (
                  <button
                    type="button"
                    onClick={() =>
                      setReceiving({ income: inc, period: suggestedPeriod(inc, now) })
                    }
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <HandCoins className="h-3.5 w-3.5" />
                    Cobrar
                  </button>
                )}
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
      <ReceivePicker
        open={picking}
        incomes={incomes.filter((i) => i.active)}
        pending={pendingNow}
        now={now}
        onPick={(inc) => {
          setPicking(false);
          setReceiving({ income: inc, period: suggestedPeriod(inc, now) });
        }}
        onClose={() => setPicking(false)}
      />
      <ReceiveDialog
        income={receiving?.income ?? null}
        period={receiving?.period ?? now}
        accounts={accounts}
        onClose={() => setReceiving(null)}
      />
      <datalist id="origin-suggestions">
        {ORIGIN_SUGGESTIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}

/** Elegir qué ingreso cobrar (acceso directo "Cobrar un ingreso"). */
function ReceivePicker({
  open,
  incomes,
  pending,
  now,
  onPick,
  onClose,
}: {
  open: boolean;
  incomes: IncomeDTO[];
  pending: IncomeDTO[];
  now: Period;
  onPick: (inc: IncomeDTO) => void;
  onClose: () => void;
}) {
  const others = incomes.filter((i) => !pending.includes(i));
  const row = (inc: IncomeDTO, isPending: boolean) => (
    <li key={inc.id}>
      <button
        type="button"
        onClick={() => onPick(inc)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">
            {inc.description}
          </span>
          <span className="text-xs text-slate-500">
            {formatMoney(inc.amount, inc.currency)} {inc.currency}
            {inc.origin ? ` · ${inc.origin}` : ""}
          </span>
        </span>
        {isPending && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
            {periodShortLabel(now)}: por cobrar
          </span>
        )}
      </button>
    </li>
  );
  return (
    <Modal open={open} onClose={onClose} title="¿Qué ingreso cobraste?">
      {incomes.length === 0 ? (
        <p className="text-sm text-slate-500">
          Todavía no cargaste ingresos. Cargá uno con “Nuevo ingreso”.
        </p>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
              {pending.map((i) => row(i, true))}
            </ul>
          )}
          {others.length > 0 && (
            <>
              {pending.length > 0 && (
                <p className="text-xs font-medium text-slate-500">Otros ingresos</p>
              )}
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                {others.map((i) => row(i, false))}
              </ul>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Cobros del mes actual y de los últimos meses, con opción de deshacer. */
function ReceiptStatus({
  income,
  now,
  onUndo,
}: {
  income: IncomeDTO;
  now: Period;
  onUndo: (receiptId: string) => void;
}) {
  const recent = [...income.receipts]
    .sort((a, b) => (a.period < b.period ? 1 : -1))
    .slice(0, 3);
  const pendingNow =
    appliesTo(income, now) && !income.receipts.some((r) => r.period === now);
  if (recent.length === 0 && !pendingNow) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {pendingNow && (
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
          {periodShortLabel(now)}: por cobrar
        </span>
      )}
      {recent.map((r) => (
        <span
          key={r.id}
          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700"
          title={`Cobrado el ${dateLabel(r.date)}`}
        >
          {periodShortLabel(r.period)}: cobrado {formatMoney(r.amount, income.currency)}
          <button
            type="button"
            onClick={() => onUndo(r.id)}
            className="rounded p-0.5 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-800"
            aria-label={`Deshacer el cobro de ${periodShortLabel(r.period)}`}
            title="Deshacer: la plata sale de las cuentas y vuelve a estar por cobrar"
          >
            <Undo2 className="h-3 w-3" />
          </button>
        </span>
      ))}
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
