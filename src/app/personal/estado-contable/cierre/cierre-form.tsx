"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, Input, Select, Button, ErrorText } from "@/components/ui";
import { formatMoney, type Currency } from "@/lib/money";
import { todayStr } from "@/lib/pf";
import { currentPeriod } from "@/lib/period";
import { useAction } from "@/features/contable/use-action";
import { reconcileAccounts } from "@/features/contable/actions";
import type { SavingsAccountDTO } from "@/features/contable/types";

const CURRENCIES: Currency[] = ["ARS", "USD"];

type Row = { real: string; missingAs: "gasto" | "ajuste" };

/**
 * Una fila por cuenta: saldo según la app, saldo real que cargás y la
 * diferencia. Solo se cierran las cuentas con saldo real cargado.
 */
export function CierreForm({ accounts }: { accounts: SavingsAccountDTO[] }) {
  const { pending, error, exec } = useAction();
  const [period, setPeriod] = useState(currentPeriod());
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [done, setDone] = useState(false);

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Todavía no tenés cuentas de ahorro.{" "}
        <Link
          href="/personal/estado-contable/ahorros"
          className="font-medium text-slate-700 underline underline-offset-2"
        >
          Creá una en Ahorros
        </Link>
        .
      </div>
    );
  }

  const row = (id: string): Row => rows[id] ?? { real: "", missingAs: "gasto" };
  const diffOf = (a: SavingsAccountDTO) => {
    const r = row(a.id).real;
    return r === "" ? null : Math.round((Number(r) - a.balance) * 100) / 100;
  };
  const filled = accounts.filter((a) => row(a.id).real !== "");

  function patch(id: string, p: Partial<Row>) {
    setDone(false);
    setRows({ ...rows, [id]: { ...row(id), ...p } });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    exec(
      () =>
        reconcileAccounts({
          period,
          date,
          items: filled.map((a) => ({
            accountId: a.id,
            realBalance: Number(row(a.id).real),
            missingAs: row(a.id).missingAs,
          })),
        }),
      () => {
        setRows({});
        setDone(true);
      },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[12rem_12rem]">
        <Field label="Mes que cerrás">
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value || currentPeriod())}
            required
          />
        </Field>
        <Field label="Fecha">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
      </div>

      {CURRENCIES.map((c) => {
        const list = accounts.filter((a) => a.currency === c);
        if (list.length === 0) return null;
        const totalDiff = list.reduce((acc, a) => acc + (diffOf(a) ?? 0), 0);
        return (
          <section
            key={c}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Cuentas en {c}</span>
              {list.some((a) => diffOf(a) != null) && (
                <span className="normal-case tracking-normal tabular-nums text-slate-700">
                  Diferencia total: {totalDiff > 0 ? "+" : totalDiff < 0 ? "−" : ""}
                  {formatMoney(Math.abs(totalDiff), c)}
                </span>
              )}
            </header>
            <ul className="divide-y divide-slate-100">
              {list.map((a) => {
                const diff = diffOf(a);
                return (
                  <li
                    key={a.id}
                    className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_9rem_10rem] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {a.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        En la app:{" "}
                        <span className="tabular-nums">{formatMoney(a.balance, c)}</span>
                      </p>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Saldo real"
                      value={row(a.id).real}
                      onChange={(e) => patch(a.id, { real: e.target.value })}
                      className="text-right tabular-nums"
                      aria-label={`Saldo real de ${a.name}`}
                    />
                    <div className="text-right text-xs sm:text-sm">
                      {diff == null ? (
                        <span className="text-slate-400">sin cargar</span>
                      ) : diff === 0 ? (
                        <span className="font-medium text-emerald-700">coincide</span>
                      ) : diff > 0 ? (
                        <span className="tabular-nums text-slate-700">
                          sobra {formatMoney(diff, c)}
                          <span className="block text-[11px] text-slate-400">
                            se suma como ajuste
                          </span>
                        </span>
                      ) : (
                        <span className="grid gap-1 tabular-nums text-slate-700">
                          falta {formatMoney(-diff, c)}
                          <Select
                            value={row(a.id).missingAs}
                            onChange={(e) =>
                              patch(a.id, {
                                missingAs: e.target.value as Row["missingAs"],
                              })
                            }
                            className="py-1 text-xs"
                            aria-label={`Cómo registrar lo que falta en ${a.name}`}
                          >
                            <option value="gasto">Gasto no registrado</option>
                            <option value="ajuste">Solo ajustar saldo</option>
                          </Select>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="text-xs text-slate-500">
        “Gasto no registrado” crea un gasto ya pagado en la categoría No
        registrados (etiqueta Otros), para que aparezca en Estadísticas y
        descuente del presupuesto de Otros. “Solo ajustar saldo” sirve para
        comisiones, redondeos o rendimientos.
      </p>

      <ErrorText>{error}</ErrorText>
      {done && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Cierre guardado. Los saldos de las cuentas ya están actualizados.
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || filled.length === 0}>
          {pending
            ? "Guardando…"
            : filled.length > 0
              ? `Confirmar cierre (${filled.length} cuenta${filled.length > 1 ? "s" : ""})`
              : "Confirmar cierre"}
        </Button>
      </div>
    </form>
  );
}
