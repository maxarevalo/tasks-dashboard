"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Power, CircleSlash } from "lucide-react";
import { Button } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { periodShortLabel, currentPeriod } from "@/lib/period";
import { useAction } from "@/features/gastos/use-action";
import {
  updateFixedExpense,
  deleteFixedExpense,
} from "@/features/gastos/actions";
import type { CardDTO, FixedExpenseDTO } from "@/features/gastos/types";
import { FixedForm } from "../_components/fixed-form";

export function FixedManager({
  fixed,
  cards,
}: {
  fixed: FixedExpenseDTO[];
  cards: CardDTO[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpenseDTO | null>(null);
  const { exec } = useAction();
  const now = currentPeriod();

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
          Nuevo gasto fijo
        </Button>
      </div>

      {fixed.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Todavía no cargaste gastos fijos.
        </div>
      )}

      <ul className="space-y-2">
        {fixed.map((f) => {
          const finished = f.endPeriod != null && f.endPeriod < now;
          return (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`flex items-center gap-2 truncate text-sm font-medium ${
                    f.active && !finished ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {f.description}
                  {!f.active && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                      Pausado
                    </span>
                  )}
                  {finished && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                      Finalizó
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {formatMoney(f.amount, f.currency)} {f.currency} ·{" "}
                  {f.category === "prestamo" ? "Préstamo" : "Fijo"}
                  {f.cardName ? ` · ${f.cardName}` : ""} · desde{" "}
                  {periodShortLabel(f.startPeriod)}
                  {f.endPeriod
                    ? ` hasta ${periodShortLabel(f.endPeriod)}`
                    : ""}
                  {f.frequency === "annual" ? " · anual" : ""}
                  {f.autoGenerate ? " · automático" : " · manual"}
                </p>
                {f.skipPeriods.length > 0 && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                    <CircleSlash className="h-3 w-3" />
                    Salteado en{" "}
                    {f.skipPeriods
                      .slice()
                      .sort()
                      .map(periodShortLabel)
                      .join(", ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  exec(() =>
                    updateFixedExpense(f.id, {
                      description: f.description,
                      amount: f.amount,
                      currency: f.currency,
                      category: f.category,
                      cardId: f.cardId ?? "",
                      startPeriod: f.startPeriod,
                      endPeriod: f.endPeriod ?? "",
                      frequency: f.frequency,
                      autoGenerate: f.autoGenerate,
                      active: !f.active,
                    }),
                  )
                }
                className={`grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 ${
                  f.active ? "text-emerald-600" : "text-slate-300"
                }`}
                aria-label={f.active ? "Pausar" : "Reactivar"}
                title={f.active ? "Pausar" : "Reactivar"}
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(f);
                  setOpen(true);
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => exec(() => deleteFixedExpense(f.id))}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Borrar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <FixedForm
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        cards={cards}
      />
    </div>
  );
}
