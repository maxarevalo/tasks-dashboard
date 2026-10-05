"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { todayStr } from "@/lib/pf";
import { periodLabel, type Period } from "@/lib/period";
import { useAction } from "@/features/contable/use-action";
import { receiveIncome } from "@/features/contable/actions";
import type { IncomeDTO, SavingsAccountDTO } from "@/features/contable/types";

type Split = { accountId: string; amount: string };

/**
 * Registra el cobro real de un ingreso: monto efectivo (puede diferir del
 * estimado) repartido en una o más cuentas de ahorro de la misma moneda.
 */
export function ReceiveDialog({
  income,
  period,
  accounts,
  onClose,
}: {
  /** null = cerrado. */
  income: IncomeDTO | null;
  period: Period;
  accounts: SavingsAccountDTO[];
  onClose: () => void;
}) {
  const { pending, error, exec, setError } = useAction();
  const [month, setMonth] = useState(period);
  const [date, setDate] = useState(todayStr());
  const [splits, setSplits] = useState<Split[]>([]);

  const own = income ? accounts.filter((a) => a.currency === income.currency) : [];

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = income ? `${income.id}-${period}` : null;
  if (key && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setMonth(period);
    setDate(todayStr());
    const first = own.find((a) => a.receivesNet) ?? own[0];
    setSplits([{ accountId: first?.id ?? "", amount: String(income!.amount) }]);
  } else if (!key && syncedFor !== null) {
    setSyncedFor(null);
  }

  if (!income) return null;

  const total = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const diff = total - income.amount;

  function patch(i: number, p: Partial<Split>) {
    setSplits(splits.map((s, j) => (j === i ? { ...s, ...p } : s)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    exec(
      () =>
        receiveIncome({
          incomeId: income!.id,
          period: month,
          date,
          splits: splits.map((s) => ({
            accountId: s.accountId,
            amount: Number(s.amount),
          })),
        }),
      onClose,
    );
  }

  return (
    <Modal open onClose={onClose} title={`Cobrar ${income.description}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Estimado: {formatMoney(income.amount, income.currency)} {income.currency}.
          Cargá lo que cobraste de verdad y a qué cuenta entró. Desde ahí, la
          proyección deja de sumar el estimado de{" "}
          {periodLabel(month).toLowerCase()}.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mes del ingreso">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || period)}
              required
            />
          </Field>
          <Field label="Fecha de cobro">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
        </div>

        {own.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            No tenés cuentas de ahorro en {income.currency}.{" "}
            <Link
              href="/personal/estado-contable/ahorros"
              className="font-medium underline underline-offset-2"
            >
              Creá una en Ahorros
            </Link>{" "}
            para registrar el cobro.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Entró a</p>
            {splits.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={s.accountId}
                    onChange={(e) => patch(i, { accountId: e.target.value })}
                    aria-label="Cuenta"
                    required
                  >
                    {own.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.category ? ` · ${a.category}` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-32 shrink-0">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={s.amount}
                    onChange={(e) => patch(i, { amount: e.target.value })}
                    className="text-right tabular-nums"
                    aria-label="Monto"
                    required
                  />
                </div>
                {splits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSplits(splits.filter((_, j) => j !== i))}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Quitar cuenta"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setSplits([
                    ...splits,
                    {
                      accountId:
                        own.find((a) => !splits.some((s) => s.accountId === a.id))?.id ??
                        own[0].id,
                      amount: "",
                    },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <Plus className="h-3.5 w-3.5" />
                Repartir en otra cuenta
              </button>
              <p className="text-sm tabular-nums text-slate-700">
                Cobrado:{" "}
                <span className="font-semibold text-slate-900">
                  {formatMoney(total, income.currency)}
                </span>
                {Math.abs(diff) >= 0.005 && (
                  <span className="ml-1.5 text-xs text-slate-500">
                    ({diff > 0 ? "+" : "−"}
                    {formatMoney(Math.abs(diff), income.currency)} vs estimado)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || own.length === 0 || total <= 0}>
            {pending ? "Guardando…" : "Registrar cobro"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
