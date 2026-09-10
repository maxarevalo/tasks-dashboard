"use client";

import { useState } from "react";
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, Star } from "lucide-react";
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
} from "@/features/contable/actions";
import {
  AVAILABILITY_LABELS,
  type SavingsAccountDTO,
  type ReturnMode,
} from "@/features/contable/types";

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
}: {
  accounts: SavingsAccountDTO[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsAccountDTO | null>(null);
  const { exec } = useAction();

  const grouped = groupByCategory(accounts);

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
          Nueva cuenta
        </Button>
      </div>

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
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
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
          <Field label="Saldo actual">
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
