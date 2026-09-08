"use client";

import { useState } from "react";
import { Plus, Check, Pencil, Trash2, CreditCard, Repeat } from "lucide-react";
import { Button } from "@/components/ui";
import { RowMenu, type RowMenuItem } from "@/components/row-menu";
import { formatMoney } from "@/lib/money";
import { useAction } from "@/features/gastos/use-action";
import { setExpensePaid, deleteExpense } from "@/features/gastos/actions";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CardDTO,
  type ExpenseDTO,
} from "@/features/gastos/types";
import type { Period } from "@/lib/period";
import { ExpenseForm } from "./expense-form";

export function ExpensesPanel({
  period,
  expenses,
  cards,
}: {
  period: Period;
  expenses: ExpenseDTO[];
  cards: CardDTO[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseDTO | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: ExpenseDTO) => {
    setEditing(e);
    setFormOpen(true);
  };

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: expenses.filter((e) => e.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Detalle</h3>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Agregar gasto
        </Button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No hay gastos cargados en este mes.
        </div>
      ) : (
        grouped.map(({ cat, items }) => (
          <section
            key={cat}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <header className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {CATEGORY_LABELS[cat]}
            </header>
            <ul className="divide-y divide-slate-100">
              {items.map((e) => (
                <ExpenseRow key={e.id} expense={e} onEdit={() => openEdit(e)} />
              ))}
            </ul>
          </section>
        ))
      )}

      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        period={period}
        cards={cards}
        editing={editing}
      />
    </div>
  );
}

function ExpenseRow({
  expense: e,
  onEdit,
}: {
  expense: ExpenseDTO;
  onEdit: () => void;
}) {
  const { pending, exec } = useAction();

  const del = (scope: "one" | "group-future" | "group-all") =>
    exec(() => deleteExpense(e.id, scope));

  const menuItems: RowMenuItem[] = [
    {
      label: "Editar",
      icon: <Pencil className="h-3.5 w-3.5" />,
      onClick: onEdit,
    },
    {
      label: e.groupId ? "Borrar esta cuota" : "Borrar",
      icon: <Trash2 className="h-3.5 w-3.5" />,
      danger: true,
      onClick: () => del("one"),
    },
    ...(e.groupId
      ? [
          {
            label: "Borrar esta y futuras",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            danger: true,
            onClick: () => del("group-future"),
          },
          {
            label: "Borrar todas las cuotas",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            danger: true,
            onClick: () => del("group-all"),
          },
        ]
      : []),
  ];

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => exec(() => setExpensePaid(e.id, !e.paid))}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
          e.paid
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-slate-300 text-transparent hover:border-slate-400"
        }`}
        aria-label={e.paid ? "Marcar como pendiente" : "Marcar como pagado"}
      >
        <Check className="h-3 w-3" />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium ${
            e.paid ? "text-slate-400 line-through" : "text-slate-900"
          }`}
        >
          {e.description}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          {e.cardName && (
            <span className="inline-flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              {e.cardName}
            </span>
          )}
          {e.installment && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              cuota {e.installment.current}/{e.installment.total}
            </span>
          )}
          {e.source === "fixed" && <span>fijo</span>}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-slate-900">
          {formatMoney(e.amount, e.currency)}
        </p>
        <p className="text-[10px] text-slate-400">{e.currency}</p>
      </div>

      <div className="shrink-0">
        <RowMenu items={menuItems} />
      </div>
    </li>
  );
}
