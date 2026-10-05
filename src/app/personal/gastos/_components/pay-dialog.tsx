"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney, type Currency } from "@/lib/money";
import { todayStr } from "@/lib/pf";
import { useAction } from "@/features/gastos/use-action";
import { payExpenses } from "@/features/gastos/actions";
import type { ExpenseDTO } from "@/features/gastos/types";

/** Lo mínimo de una cuenta de ahorro para elegir de dónde sale un pago. */
export type PayAccount = {
  id: string;
  name: string;
  currency: Currency;
  balance: number;
  receivesNet: boolean;
};

const CURRENCIES: Currency[] = ["ARS", "USD"];

/** Cuenta sugerida: la que recibe el excedente, si no la primera de esa moneda. */
function defaultAccount(accounts: PayAccount[], c: Currency): string {
  const own = accounts.filter((a) => a.currency === c);
  return (own.find((a) => a.receivesNet) ?? own[0])?.id ?? "";
}

/**
 * Paga uno o varios gastos: cada gasto queda pagado y su monto sale de la
 * cuenta elegida para su moneda. El monto pagado se puede ajustar; si es
 * menor, el gasto igual queda pagado.
 */
export function PayDialog({
  title,
  items,
  accounts,
  onClose,
}: {
  title: string;
  /** null = cerrado. */
  items: ExpenseDTO[] | null;
  accounts: PayAccount[];
  onClose: () => void;
}) {
  const { pending, error, exec, setError } = useAction();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [date, setDate] = useState(todayStr());
  const [accountFor, setAccountFor] = useState<Record<Currency, string>>({
    ARS: "",
    USD: "",
  });
  const [skipAccounts, setSkipAccounts] = useState(false);

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = items ? items.map((i) => i.id).join(",") : null;
  if (key && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setSelected(new Set(items!.map((i) => i.id)));
    setAmounts(Object.fromEntries(items!.map((i) => [i.id, String(i.amount)])));
    setDate(todayStr());
    setAccountFor({
      ARS: defaultAccount(accounts, "ARS"),
      USD: defaultAccount(accounts, "USD"),
    });
    setSkipAccounts(false);
  } else if (!key && syncedFor !== null) {
    setSyncedFor(null);
  }

  if (!items) return null;

  const chosen = items.filter((i) => selected.has(i.id));
  const totals = Object.fromEntries(
    CURRENCIES.map((c) => [
      c,
      chosen
        .filter((i) => i.currency === c)
        .reduce((acc, i) => acc + (Number(amounts[i.id]) || 0), 0),
    ]),
  ) as Record<Currency, number>;
  const usedCurrencies = CURRENCIES.filter((c) =>
    chosen.some((i) => i.currency === c),
  );
  const missingAccounts = usedCurrencies.filter(
    (c) => !accounts.some((a) => a.currency === c),
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    exec(
      () =>
        payExpenses({
          items: chosen.map((i) => ({ id: i.id, amount: Number(amounts[i.id]) })),
          date,
          accounts: {
            ARS: accountFor.ARS || undefined,
            USD: accountFor.USD || undefined,
          },
          skipAccounts,
        }),
      onClose,
    );
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <form onSubmit={submit} className="space-y-4">
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-3 py-2">
              <input
                id={`pay-${i.id}`}
                type="checkbox"
                checked={selected.has(i.id)}
                onChange={() => toggle(i.id)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label
                htmlFor={`pay-${i.id}`}
                className="min-w-0 flex-1 truncate text-sm text-slate-800"
              >
                {i.description}
                {i.cardName && (
                  <span className="ml-1.5 text-xs text-slate-400">{i.cardName}</span>
                )}
              </label>
              <span className="text-xs text-slate-400">{i.currency}</span>
              <div className="w-28 shrink-0">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amounts[i.id] ?? ""}
                  onChange={(e) =>
                    setAmounts({ ...amounts, [i.id]: e.target.value })
                  }
                  disabled={!selected.has(i.id)}
                  className="text-right tabular-nums"
                  aria-label={`Monto pagado de ${i.description}`}
                  required={selected.has(i.id)}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fecha del pago">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <div className="grid content-end gap-1 text-right text-sm">
            {usedCurrencies.map((c) => (
              <p key={c} className="tabular-nums text-slate-700">
                Total {c}:{" "}
                <span className="font-semibold text-slate-900">
                  {formatMoney(totals[c], c)}
                </span>
              </p>
            ))}
          </div>
        </div>

        {!skipAccounts &&
          usedCurrencies.map((c) =>
            accounts.some((a) => a.currency === c) ? (
              <Field key={c} label={`Sale de la cuenta (${c})`}>
                <Select
                  value={accountFor[c]}
                  onChange={(e) =>
                    setAccountFor({ ...accountFor, [c]: e.target.value })
                  }
                  required
                >
                  {accounts
                    .filter((a) => a.currency === c)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} · {formatMoney(a.balance, c)}
                      </option>
                    ))}
                </Select>
              </Field>
            ) : null,
          )}

        {!skipAccounts && missingAccounts.length > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            No tenés cuentas de ahorro en {missingAccounts.join(" ni ")}.{" "}
            <Link
              href="/personal/estado-contable/ahorros"
              className="font-medium underline underline-offset-2"
            >
              Creá una en Ahorros
            </Link>{" "}
            o marcalo como pagado sin descontar.
          </p>
        )}

        <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={skipAccounts}
            onChange={(e) => setSkipAccounts(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            Solo marcar como pagado, sin descontar de ninguna cuenta
            <span className="block text-xs text-slate-500">
              Para pagos que ya están reflejados en el saldo de tus ahorros.
            </span>
          </span>
        </label>

        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              pending ||
              chosen.length === 0 ||
              (!skipAccounts && missingAccounts.length > 0)
            }
          >
            {pending
              ? "Pagando…"
              : chosen.length > 1
                ? `Pagar ${chosen.length} gastos`
                : "Pagar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
