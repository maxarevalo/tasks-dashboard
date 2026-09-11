"use client";

import { useState } from "react";
import {
  Plus,
  Check,
  Pencil,
  Trash2,
  CreditCard,
  Repeat,
  CalendarX,
  CircleSlash,
  ClipboardPaste,
  CopyPlus,
  CopyCheck,
} from "lucide-react";
import { Button } from "@/components/ui";
import { RowMenu, type RowMenuItem } from "@/components/row-menu";
import { formatMoney } from "@/lib/money";
import { useAction } from "@/features/gastos/use-action";
import {
  setExpensePaid,
  deleteExpense,
  skipFixedForPeriod,
  replicateExpense,
} from "@/features/gastos/actions";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CardDTO,
  type ExpenseDTO,
  type FixedExpenseDTO,
} from "@/features/gastos/types";
import { periodLabel, addMonths, type Period } from "@/lib/period";
import { EXPENSE_TAG_ICONS } from "@/lib/tags";
import { ExpenseForm } from "./expense-form";
import { FixedForm } from "./fixed-form";
import { BulkImport } from "./bulk-import";
import { ReplicateDialog } from "./replicate-dialog";

export function ExpensesPanel({
  period,
  expenses,
  cards,
  fixedTemplates,
}: {
  period: Period;
  expenses: ExpenseDTO[];
  cards: CardDTO[];
  fixedTemplates: FixedExpenseDTO[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseDTO | null>(null);
  const [fixedEditing, setFixedEditing] = useState<FixedExpenseDTO | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [replicateOpen, setReplicateOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: expenses.filter((e) => e.category === cat),
  })).filter((g) => g.items.length > 0);

  const replicableExpenses = expenses.filter(
    (e) => e.source !== "installment" && !e.replicatedNextMonth,
  );
  const nextLabel = periodLabel(addMonths(period, 1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Detalle</h3>
        <div className="flex flex-wrap gap-2">
          {replicableExpenses.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setReplicateOpen(true)}
            >
              <CopyPlus className="h-4 w-4" />
              Replicar mes siguiente
            </Button>
          )}
          <Button variant="secondary" onClick={() => setBulkOpen(true)}>
            <ClipboardPaste className="h-4 w-4" />
            Importar
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Agregar gasto
          </Button>
        </div>
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
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  onEdit={() => {
                    setEditing(e);
                    setFormOpen(true);
                  }}
                  onEditFixed={() => {
                    const t = fixedTemplates.find((f) => f.id === e.fixedId);
                    if (t) setFixedEditing(t);
                  }}
                />
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

      <FixedForm
        open={fixedEditing != null}
        onClose={() => setFixedEditing(null)}
        editing={fixedEditing}
        cards={cards}
        effectiveFrom={period}
      />

      <BulkImport
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        period={period}
        cards={cards}
      />

      <ReplicateDialog
        open={replicateOpen}
        onClose={() => setReplicateOpen(false)}
        nextLabel={nextLabel}
        items={replicableExpenses}
      />
    </div>
  );
}

function ExpenseRow({
  expense: e,
  onEdit,
  onEditFixed,
}: {
  expense: ExpenseDTO;
  onEdit: () => void;
  onEditFixed: () => void;
}) {
  const { pending, exec } = useAction();
  const isFixed = e.source === "fixed";
  const canReplicate = e.source !== "installment" && !e.replicatedNextMonth;

  const del = (scope: "one" | "group-future" | "group-all") =>
    exec(() => deleteExpense(e.id, scope));

  const replicateItem: RowMenuItem[] = canReplicate
    ? [
        {
          label: "Replicar al mes siguiente",
          icon: <CopyPlus className="h-3.5 w-3.5" />,
          onClick: () => exec(() => replicateExpense(e.id)),
        },
      ]
    : [];

  const menuItems: RowMenuItem[] = isFixed
    ? [
        {
          label: "Editar el gasto fijo…",
          icon: <Pencil className="h-3.5 w-3.5" />,
          onClick: onEditFixed,
        },
        {
          label: "Editar solo este mes",
          icon: <Pencil className="h-3.5 w-3.5" />,
          onClick: onEdit,
        },
        ...replicateItem,
        {
          label: "Quitar de este mes",
          icon: <CircleSlash className="h-3.5 w-3.5" />,
          danger: true,
          onClick: () => exec(() => skipFixedForPeriod(e.id)),
        },
      ]
    : [
        {
          label: "Editar",
          icon: <Pencil className="h-3.5 w-3.5" />,
          onClick: onEdit,
        },
        ...replicateItem,
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
          {e.tag && <span title={e.tag}>{EXPENSE_TAG_ICONS[e.tag]} </span>}
          {e.description}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
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
          {isFixed && e.overridden && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              editado a mano
            </span>
          )}
          {e.fixedStatus === "ends" && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              <CalendarX className="h-3 w-3" />
              No sigue el mes que viene
            </span>
          )}
          {e.fixedStatus === "orphan" && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              <CalendarX className="h-3 w-3" />
              Plantilla eliminada
            </span>
          )}
          {e.replicatedNextMonth && (
            <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
              <CopyCheck className="h-3 w-3" />
              Replicado en próx. mes
            </span>
          )}
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
