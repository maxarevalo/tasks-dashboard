"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Star,
  ChevronDown,
  ArrowLeftRight,
  Undo2,
  ClipboardCheck,
  History,
} from "lucide-react";
import Link from "next/link";
import { TransferDialog } from "./transfer-dialog";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { currentPeriod } from "@/lib/period";
import { RETURN_MODE_LABELS } from "@/lib/rates";
import { useAction } from "@/features/contable/use-action";
import {
  createSavingsAccount,
  updateSavingsAccount,
  setSavingsArchived,
  deleteSavingsAccount,
  undoTransfer,
} from "@/features/contable/actions";
import {
  AVAILABILITY_LABELS,
  type AccountMovementDTO,
  type AccountChangeDTO,
  type SavingsAccountDTO,
  type ReturnMode,
} from "@/features/contable/types";
import { dateLabel } from "@/lib/pf";
import { MaturityBadge } from "@/components/maturity-badge";
import type { Currency } from "@/lib/money";

const CATEGORY_SUGGESTIONS = [
  "Reserva de emergencia",
  "Objetivo",
  "Inversión",
  "Operativo",
  "Vacaciones",
];

const RETURN_MODES: ReturnMode[] = ["none", "tna", "tea", "monthly", "manual"];

export function SavingsManager({
  accounts,
  movements,
  changes,
}: {
  accounts: SavingsAccountDTO[];
  /** Últimos movimientos por id de cuenta. */
  movements: Record<string, AccountMovementDTO[]>;
  /** Historial de cambios de configuración por id de cuenta. */
  changes: Record<string, AccountChangeDTO[]>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsAccountDTO | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const { exec } = useAction();
  const activeAccounts = accounts.filter((a) => !a.archived);

  const grouped = groupByCategory(accounts);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href="/personal/estado-contable/cierre"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ClipboardCheck className="h-4 w-4" />
          Cierre de mes
        </Link>
        <Button
          variant="secondary"
          onClick={() => setTransferOpen(true)}
          disabled={activeAccounts.length < 2}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Transferir
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nueva cuenta
        </Button>
      </div>
      <TransferDialog
        open={transferOpen}
        accounts={activeAccounts}
        onClose={() => setTransferOpen(false)}
      />

      {accounts.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Todavía no cargaste cuentas de ahorro.
        </div>
      )}

      {grouped.map(([category, items]) => (
        <section key={category}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {category}
          </h3>
          <ul className="space-y-2">
            {items.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={`flex items-center gap-2 text-sm font-medium ${
                      a.archived ? "text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {a.name}
                    {a.receivesNet && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Star className="h-2.5 w-2.5" />
                        excedente
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatMoney(a.balance, a.currency)} {a.currency} ·{" "}
                    {AVAILABILITY_LABELS[a.availability]} ·{" "}
                    {RETURN_MODE_LABELS[a.return.mode]}
                    {(a.return.mode === "tna" || a.return.mode === "tea") &&
                      ` ${a.return.annualRatePct}%`}
                    {a.return.mode === "monthly" &&
                      ` ${a.return.monthlyRatePct}%/mes`}
                  </p>
                  {a.maturityDate && !a.archived && (
                    <MaturityBadge date={a.maturityDate} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(a);
                    setOpen(true);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exec(() => setSavingsArchived(a.id, !a.archived))
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={a.archived ? "Restaurar" : "Archivar"}
                >
                  {a.archived ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => exec(() => deleteSavingsAccount(a.id))}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Borrar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                </div>
                <AccountMovements
                  currency={a.currency}
                  movements={movements[a.id] ?? []}
                />
                <AccountChanges changes={changes[a.id] ?? []} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <AccountForm
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
      />
      <datalist id="category-suggestions">
        {CATEGORY_SUGGESTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}

const KIND_LABELS: Record<AccountMovementDTO["kind"], string> = {
  pago: "Pago",
  cobro: "Cobro",
  ajuste: "Ajuste",
  transferencia: "Transferencia",
};

/** Historial plegable de pagos, cobros y ajustes de una cuenta. */
function AccountMovements({
  currency,
  movements,
}: {
  currency: Currency;
  movements: AccountMovementDTO[];
}) {
  const [open, setOpen] = useState(false);
  const { pending, exec } = useAction();
  if (movements.length === 0) return null;
  return (
    <div className="border-t border-slate-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        aria-expanded={open}
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
        Movimientos ({movements.length}
        {movements.length >= 20 ? "+" : ""})
      </button>
      {open && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {movements.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="w-24 shrink-0 text-xs text-slate-500">
                {dateLabel(m.date)}
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-700">
                <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  {KIND_LABELS[m.kind]}
                </span>
                {m.description}
              </span>
              <span
                className={`shrink-0 tabular-nums font-medium ${
                  m.amount < 0 ? "text-slate-900" : "text-emerald-700"
                }`}
              >
                {m.amount > 0 ? "+" : "−"}
                {formatMoney(Math.abs(m.amount), currency)}
              </span>
              {m.transferId && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => exec(() => undoTransfer(m.transferId!))}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Deshacer transferencia"
                  title="Deshacer la transferencia (en las dos cuentas)"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "9 oct 2026, 14:05" en la hora local del navegador. */
function changeDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replaceAll(".", "");
}

/** Historial plegable de cambios de la cuenta: alta, tasa, vencimiento, nombre… */
function AccountChanges({ changes }: { changes: AccountChangeDTO[] }) {
  const [open, setOpen] = useState(false);
  if (changes.length === 0) return null;
  return (
    <div className="border-t border-slate-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        aria-expanded={open}
      >
        <History className="h-3.5 w-3.5" />
        Historial de cambios ({changes.length}
        {changes.length >= 20 ? "+" : ""})
      </button>
      {open && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {changes.map((c) => (
            <li key={c.id} className="px-4 py-2 text-sm">
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span suppressHydrationWarning>{changeDate(c.at)}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                  {c.kind === "alta" ? "Alta" : "Edición"}
                </span>
                {c.source === "mcp" && (
                  <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                    Asistente IA
                  </span>
                )}
              </p>
              <ul className="mt-1 space-y-0.5">
                {c.changes.map((ch) => (
                  <li key={ch.field} className="text-slate-700">
                    <span className="text-slate-500">{ch.label}:</span>{" "}
                    {c.kind === "edicion" && (
                      <>
                        <span className="text-slate-400 line-through">
                          {ch.from || "—"}
                        </span>{" "}
                        →{" "}
                      </>
                    )}
                    <span className="font-medium">{ch.to || "—"}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function groupByCategory(
  accounts: SavingsAccountDTO[],
): [string, SavingsAccountDTO[]][] {
  const map = new Map<string, SavingsAccountDTO[]>();
  for (const a of accounts) {
    const k = a.category || "Sin categoría";
    map.set(k, [...(map.get(k) ?? []), a]);
  }
  return [...map.entries()];
}

type ManualRow = { period: string; amount: string };

function AccountForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: SavingsAccountDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] =
    useState<SavingsAccountDTO["availability"]>("inmediata");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [balance, setBalance] = useState("");
  const [balanceAsOf, setBalanceAsOf] = useState(currentPeriod());
  const [receivesNet, setReceivesNet] = useState(false);
  const [mode, setMode] = useState<ReturnMode>("none");
  const [annualRatePct, setAnnualRatePct] = useState("");
  const [monthlyRatePct, setMonthlyRatePct] = useState("");
  const [manual, setManual] = useState<ManualRow[]>([]);
  const [maturityDate, setMaturityDate] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setName(editing?.name ?? "");
    setCategory(editing?.category ?? "");
    setAvailability(editing?.availability ?? "inmediata");
    setCurrency(editing?.currency ?? "ARS");
    setBalance(editing ? String(editing.balance) : "");
    setBalanceAsOf(editing?.balanceAsOf || currentPeriod());
    setReceivesNet(editing?.receivesNet ?? false);
    setMode(editing?.return.mode ?? "none");
    setAnnualRatePct(
      editing?.return.annualRatePct ? String(editing.return.annualRatePct) : "",
    );
    setMonthlyRatePct(
      editing?.return.monthlyRatePct
        ? String(editing.return.monthlyRatePct)
        : "",
    );
    setMaturityDate(editing?.maturityDate ?? "");
    setManual(
      (editing?.manualProjections ?? []).map((m) => ({
        period: m.period,
        amount: String(m.amount),
      })),
    );
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      category,
      availability,
      currency,
      balance: Number(balance) || 0,
      balanceAsOf,
      receivesNet,
      return: {
        mode,
        annualRatePct: Number(annualRatePct) || 0,
        monthlyRatePct: Number(monthlyRatePct) || 0,
      },
      manualProjections:
        mode === "manual"
          ? manual
              .filter((m) => m.period && m.amount !== "")
              .map((m) => ({ period: m.period, amount: Number(m.amount) }))
          : [],
      // Solo las cuentas remuneradas tienen vencimiento.
      maturityDate: mode === "none" ? "" : maturityDate,
    };
    exec(
      () =>
        editing
          ? updateSavingsAccount(editing.id, payload)
          : createSavingsAccount(payload),
      onClose,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar cuenta" : "Nueva cuenta de ahorro"}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Plazo fijo Galicia, Cuenta USD…"
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Input
              list="category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Reserva, Objetivo…"
            />
          </Field>
          <Field label="Disponibilidad">
            <Select
              value={availability}
              onChange={(e) =>
                setAvailability(
                  e.target.value as SavingsAccountDTO["availability"],
                )
              }
            >
              <option value="inmediata">Inmediata</option>
              <option value="corto">Corto plazo</option>
              <option value="inmovilizada">Inmovilizada</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Moneda">
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "ARS" | "USD")}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field
            label="Saldo actual"
            hint={editing ? "Si lo cambiás, queda como ajuste en Movimientos" : undefined}
          >
            <Input
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              required
            />
          </Field>
          <Field label="Al mes">
            <Input
              type="month"
              value={balanceAsOf}
              onChange={(e) =>
                setBalanceAsOf(e.target.value || currentPeriod())
              }
            />
          </Field>
        </div>

        <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={receivesNet}
            onChange={(e) => setReceivesNet(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            Acá cae el excedente del mes (ingresos − gastos)
            <span className="block text-xs text-slate-400">
              En la proyección, el neto de cada mes se suma a esta cuenta y
              capitaliza. Una por moneda.
            </span>
          </span>
        </label>

        <Field label="Rendimiento">
          <Select
            value={mode}
            onChange={(e) => setMode(e.target.value as ReturnMode)}
          >
            {RETURN_MODES.map((m) => (
              <option key={m} value={m}>
                {RETURN_MODE_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>

        {mode !== "none" && (
          <Field
            label="Vencimiento (opcional)"
            hint="Ej. fin de un plazo fijo o de una tasa promocional: te avisamos antes"
          >
            <div className="flex gap-2">
              <Input
                type="date"
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
              />
              {maturityDate && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMaturityDate("")}
                >
                  Quitar
                </Button>
              )}
            </div>
          </Field>
        )}

        {(mode === "tna" || mode === "tea") && (
          <Field
            label={mode === "tna" ? "TNA (% anual)" : "TEA (% anual)"}
            hint="Ej: 90 para 90%"
          >
            <Input
              type="number"
              step="0.01"
              value={annualRatePct}
              onChange={(e) => setAnnualRatePct(e.target.value)}
            />
          </Field>
        )}
        {mode === "monthly" && (
          <Field label="Tasa mensual (%)" hint="Sobre el saldo inicial, sin capitalizar">
            <Input
              type="number"
              step="0.01"
              value={monthlyRatePct}
              onChange={(e) => setMonthlyRatePct(e.target.value)}
            />
          </Field>
        )}
        {mode === "manual" && (
          <div className="space-y-2 rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-600">
              Saldos proyectados por mes
            </p>
            {manual.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="month"
                  value={m.period}
                  onChange={(e) =>
                    setManual((rs) =>
                      rs.map((x, j) =>
                        j === i ? { ...x, period: e.target.value } : x,
                      ),
                    )
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Saldo"
                  value={m.amount}
                  onChange={(e) =>
                    setManual((rs) =>
                      rs.map((x, j) =>
                        j === i ? { ...x, amount: e.target.value } : x,
                      ),
                    )
                  }
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() =>
                    setManual((rs) => rs.filter((_, j) => j !== i))
                  }
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Quitar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setManual((rs) => [
                  ...rs,
                  { period: currentPeriod(), amount: "" },
                ])
              }
              className="text-xs font-medium text-slate-700 underline underline-offset-2"
            >
              + Agregar mes
            </button>
            {manual.some((m) => m.period && m.amount) && (
              <p className="text-[11px] text-slate-400">
                Entre meses cargados se mantiene el último saldo conocido.
              </p>
            )}
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
