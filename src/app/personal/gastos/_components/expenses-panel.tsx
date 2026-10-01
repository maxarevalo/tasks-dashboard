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
  Target,
} from "lucide-react";
import { Button, Field, Input, Select, ErrorText } from "@/components/ui";
import { Modal } from "@/components/modal";
import { RowMenu, type RowMenuItem } from "@/components/row-menu";
import { formatMoney, type Currency } from "@/lib/money";
import { useAction } from "@/features/gastos/use-action";
import {
  setExpensePaid,
  deleteExpense,
  skipFixedForPeriod,
  replicateExpense,
  setTagBudget,
  deleteTagBudget,
  replicateTagBudget,
} from "@/features/gastos/actions";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type BudgetDTO,
  type CardDTO,
  type ExpenseDTO,
  type ExpenseTag,
  type FixedExpenseDTO,
} from "@/features/gastos/types";
import { periodLabel, addMonths, type Period } from "@/lib/period";
import { EXPENSE_TAGS, EXPENSE_TAG_ICONS } from "@/lib/tags";
import { ExpenseForm } from "./expense-form";
import { FixedForm } from "./fixed-form";
import { BulkImport } from "./bulk-import";
import { ReplicateDialog } from "./replicate-dialog";

export function ExpensesPanel({
  period,
  expenses,
  cards,
  fixedTemplates,
  budgets,
}: {
  period: Period;
  expenses: ExpenseDTO[];
  cards: CardDTO[];
  fixedTemplates: FixedExpenseDTO[];
  budgets: BudgetDTO[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseDTO | null>(null);
  const [fixedEditing, setFixedEditing] = useState<FixedExpenseDTO | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [replicateOpen, setReplicateOpen] = useState(false);
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetDTO | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const grouped = CATEGORY_ORDER.filter((cat) => cat !== "previsto")
    .map((cat) => ({
      cat,
      items: expenses.filter((e) => e.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  const previstoItems = expenses.filter((e) => e.category === "previsto");

  const cardOrder = new Map(cards.map((c, i) => [c.id, i]));

  const replicableExpenses = expenses.filter(
    (e) => e.source !== "installment" && !e.replicatedNextMonth,
  );
  const nextLabel = periodLabel(addMonths(period, 1));

  const onEdit = (e: ExpenseDTO) => {
    setEditing(e);
    setFormOpen(true);
  };
  const onEditFixed = (e: ExpenseDTO) => {
    const t = fixedTemplates.find((f) => f.id === e.fixedId);
    if (t) setFixedEditing(t);
  };

  const hasNothing =
    grouped.length === 0 && previstoItems.length === 0 && budgets.length === 0;

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
          <Button
            variant="secondary"
            onClick={() => {
              setEditingBudget(null);
              setBudgetFormOpen(true);
            }}
          >
            <Target className="h-4 w-4" />
            Presupuesto por etiqueta
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Agregar gasto
          </Button>
        </div>
      </div>

      {hasNothing ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No hay gastos cargados en este mes.
        </div>
      ) : (
        <>
          {grouped.map(({ cat, items }) => {
            const cardGroups = groupByCard(items, cardOrder);

            return (
              <section
                key={cat}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <header className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {CATEGORY_LABELS[cat]}
                </header>

                {cardGroups.length > 1 ? (
                  cardGroups.map((g) => (
                    <div key={g.key} className="border-b border-slate-100 last:border-0">
                      <div className="flex items-center justify-between gap-2 bg-slate-50/70 px-4 py-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <CreditCard className="h-3.5 w-3.5" />
                          {g.cardName ?? "Sin tarjeta"}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-slate-700">
                          {g.subtotal.ARS !== 0 && formatMoney(g.subtotal.ARS, "ARS")}
                          {g.subtotal.ARS !== 0 && g.subtotal.USD !== 0 ? " · " : ""}
                          {g.subtotal.USD !== 0 && formatMoney(g.subtotal.USD, "USD")}
                        </span>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {g.items.map((e) => (
                          <ExpenseRow
                            key={e.id}
                            expense={e}
                            onEdit={() => onEdit(e)}
                            onEditFixed={() => onEditFixed(e)}
                          />
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {items.map((e) => (
                      <ExpenseRow
                        key={e.id}
                        expense={e}
                        onEdit={() => onEdit(e)}
                        onEditFixed={() => onEditFixed(e)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          {(previstoItems.length > 0 || budgets.length > 0) && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <header className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {CATEGORY_LABELS.previsto}
              </header>

              {budgets.length > 0 && (
                <ul className="divide-y divide-slate-100 border-b border-slate-100">
                  {budgets.map((b) => (
                    <BudgetRow
                      key={b.id}
                      budget={b}
                      onEdit={() => {
                        setEditingBudget(b);
                        setBudgetFormOpen(true);
                      }}
                    />
                  ))}
                </ul>
              )}

              {previstoItems.length > 0 &&
                (() => {
                  const cardGroups = groupByCard(previstoItems, cardOrder);
                  return cardGroups.length > 1 ? (
                    cardGroups.map((g) => (
                      <div key={g.key} className="border-b border-slate-100 last:border-0">
                        <div className="flex items-center justify-between gap-2 bg-slate-50/70 px-4 py-1.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <CreditCard className="h-3.5 w-3.5" />
                            {g.cardName ?? "Sin tarjeta"}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-slate-700">
                            {g.subtotal.ARS !== 0 && formatMoney(g.subtotal.ARS, "ARS")}
                            {g.subtotal.ARS !== 0 && g.subtotal.USD !== 0 ? " · " : ""}
                            {g.subtotal.USD !== 0 && formatMoney(g.subtotal.USD, "USD")}
                          </span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {g.items.map((e) => (
                            <ExpenseRow
                              key={e.id}
                              expense={e}
                              onEdit={() => onEdit(e)}
                              onEditFixed={() => onEditFixed(e)}
                            />
                          ))}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {previstoItems.map((e) => (
                        <ExpenseRow
                          key={e.id}
                          expense={e}
                          onEdit={() => onEdit(e)}
                          onEditFixed={() => onEditFixed(e)}
                        />
                      ))}
                    </ul>
                  );
                })()}
            </section>
          )}
        </>
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

      <BudgetForm
        open={budgetFormOpen}
        onClose={() => setBudgetFormOpen(false)}
        period={period}
        editing={editingBudget}
      />
    </div>
  );
}

type CardGroup = {
  key: string;
  cardName: string | null;
  items: ExpenseDTO[];
  subtotal: { ARS: number; USD: number };
};

/** Subagrupa los gastos de una categoría por tarjeta, con subtotal por moneda. */
function groupByCard(
  items: ExpenseDTO[],
  cardOrder: Map<string, number>,
): CardGroup[] {
  const map = new Map<string, CardGroup>();
  for (const e of items) {
    const key = e.cardId ?? "__sin_tarjeta__";
    const group = map.get(key) ?? {
      key,
      cardName: e.cardName,
      items: [],
      subtotal: { ARS: 0, USD: 0 },
    };
    group.items.push(e);
    group.subtotal[e.currency] += e.amount;
    map.set(key, group);
  }
  return [...map.values()].sort((a, b) => {
    const oa = a.cardName ? (cardOrder.get(a.key) ?? 999) : Infinity;
    const ob = b.cardName ? (cardOrder.get(b.key) ?? 999) : Infinity;
    return oa - ob;
  });
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

function BudgetRow({
  budget: b,
  onEdit,
}: {
  budget: BudgetDTO;
  onEdit: () => void;
}) {
  const { pending, exec } = useAction();
  const pct = b.amount > 0 ? Math.min(100, (b.spent / b.amount) * 100) : 0;
  const over = b.remaining < 0;

  const menuItems: RowMenuItem[] = [
    {
      label: "Editar",
      icon: <Pencil className="h-3.5 w-3.5" />,
      onClick: onEdit,
    },
    ...[1, 3, 6, 12].map((n) => ({
      label: `Replicar ${n} mes${n > 1 ? "es" : ""} siguiente${n > 1 ? "s" : ""}`,
      icon: <CopyPlus className="h-3.5 w-3.5" />,
      onClick: () => exec(() => replicateTagBudget(b.id, n)),
    })),
    {
      label: "Borrar",
      icon: <Trash2 className="h-3.5 w-3.5" />,
      danger: true,
      onClick: () => exec(() => deleteTagBudget(b.id)),
    },
  ];

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="text-lg leading-none" title={b.tag}>
        {EXPENSE_TAG_ICONS[b.tag]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{b.tag}</p>
        <div className="mt-1.5 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Gastado {formatMoney(b.spent, b.currency)} de{" "}
          {formatMoney(b.amount, b.currency)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-semibold tabular-nums ${
            over ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {over ? "-" : ""}
          {formatMoney(Math.abs(b.remaining), b.currency)}
        </p>
        <p className="text-[10px] text-slate-400">
          {over ? "excedido" : "disponible"}
        </p>
      </div>
      <div className="shrink-0">
        <RowMenu items={menuItems} />
        {pending && <span className="sr-only">Guardando…</span>}
      </div>
    </li>
  );
}

function BudgetForm({
  open,
  onClose,
  period,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  period: Period;
  editing: BudgetDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [tag, setTag] = useState<ExpenseTag>(EXPENSE_TAGS[0]);
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [amount, setAmount] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setTag(editing?.tag ?? EXPENSE_TAGS[0]);
    setCurrency(editing?.currency ?? "ARS");
    setAmount(editing ? String(editing.amount) : "");
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    exec(
      () =>
        setTagBudget({ period, tag, currency, amount: Number(amount) }),
      onClose,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar presupuesto" : "Nuevo presupuesto por etiqueta"}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Cargá un monto previsto para una etiqueta este mes: se va a ir
          descontando automáticamente por cada gasto (de cualquier
          categoría) que cargues con esa misma etiqueta. Lo que queda
          disponible cuenta como gasto previsto en los totales y la
          proyección.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Etiqueta">
            <Select
              value={tag}
              onChange={(e) => setTag(e.target.value as ExpenseTag)}
              disabled={!!editing}
            >
              {EXPENSE_TAGS.map((t) => (
                <option key={t} value={t}>
                  {EXPENSE_TAG_ICONS[t]} {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Moneda">
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              disabled={!!editing}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>

        <Field label="Monto previsto">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
        </Field>

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
