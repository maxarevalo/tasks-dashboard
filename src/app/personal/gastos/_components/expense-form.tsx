"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Textarea, Button, ErrorText } from "@/components/ui";
import { useAction } from "@/features/gastos/use-action";
import {
  createExpense,
  createInstallmentPurchase,
  updateExpense,
} from "@/features/gastos/actions";
import { addMonths, periodShortLabel, type Period } from "@/lib/period";
import { EXPENSE_TAGS, EXPENSE_TAG_ICONS } from "@/lib/tags";
import type { CardDTO, ExpenseDTO, ExpenseTag } from "@/features/gastos/types";

type Mode = "single" | "installments";

export function ExpenseForm({
  open,
  onClose,
  period,
  cards,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  period: Period;
  cards: CardDTO[];
  editing?: ExpenseDTO | null;
}) {
  const isEdit = !!editing;
  const { pending, error, exec, setError } = useAction();

  const [mode, setMode] = useState<Mode>("single");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseDTO["category"]>("tarjeta");
  const [cardId, setCardId] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState(false);
  const [tag, setTag] = useState<ExpenseTag | "">("");

  const [startPeriod, setStartPeriod] = useState<Period>(period);
  const [current, setCurrent] = useState("1");
  const [total, setTotal] = useState("3");

  // Sincroniza el formulario al abrir.
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}-${period}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setMode("single");
    setDescription(editing?.description ?? "");
    setCategory(editing?.category ?? "tarjeta");
    setCardId(editing?.cardId ?? "");
    setCurrency(editing?.currency ?? "ARS");
    setAmount(editing ? String(editing.amount) : "");
    setNote(editing?.note ?? "");
    setPaid(editing?.paid ?? false);
    setTag(editing?.tag ?? "");
    setStartPeriod(period);
    setCurrent("1");
    setTotal("3");
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  const remaining = useMemo(() => {
    const t = parseInt(total, 10);
    const c = parseInt(current, 10);
    if (!t || !c || c > t) return 0;
    return t - c + 1;
  }, [total, current]);

  const preview = useMemo(() => {
    if (mode !== "installments" || remaining <= 0) return null;
    const last = addMonths(startPeriod, remaining - 1);
    return `${remaining} cuota${remaining > 1 ? "s" : ""}: ${periodShortLabel(
      startPeriod,
    )} → ${periodShortLabel(last)}`;
  }, [mode, remaining, startPeriod]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cat = category;
    const card = cat === "tarjeta" && cardId ? cardId : undefined;

    if (isEdit && editing) {
      exec(
        () =>
          updateExpense(editing.id, {
            description,
            category: cat,
            amount: Number(amount),
            currency,
            cardId: card ?? "",
            note,
            tag,
          }),
        onClose,
      );
      return;
    }

    if (mode === "installments") {
      exec(
        () =>
          createInstallmentPurchase({
            description,
            amountPerInstallment: Number(amount),
            currency,
            category: cat === "prestamo" ? "prestamo" : "tarjeta",
            cardId: card ?? "",
            startPeriod,
            current: Number(current),
            total: Number(total),
            tag,
          }),
        onClose,
      );
      return;
    }

    exec(
      () =>
        createExpense({
          period,
          category: cat,
          description,
          amount: Number(amount),
          currency,
          cardId: card ?? "",
          note,
          paid,
          tag,
        }),
      onClose,
    );
  }

  const catForInstallments = category === "prestamo" ? "prestamo" : "tarjeta";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar gasto" : "Agregar gasto"}
    >
      <form onSubmit={submit} className="space-y-4">
        {!isEdit && (
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {(["single", "installments"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === m
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                {m === "single" ? "Único" : "En cuotas"}
              </button>
            ))}
          </div>
        )}

        <Field label="Descripción">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Supermercado, Netflix, Notebook…"
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <Select
              value={mode === "installments" ? catForInstallments : category}
              onChange={(e) =>
                setCategory(e.target.value as ExpenseDTO["category"])
              }
            >
              {mode === "installments" ? (
                <>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="prestamo">Préstamo</option>
                </>
              ) : (
                <>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="prestamo">Préstamo</option>
                  <option value="fijo">Gasto fijo</option>
                  <option value="previsto">Previsto</option>
                </>
              )}
            </Select>
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

        <Field label="Etiqueta" hint="Opcional">
          <Select
            value={tag}
            onChange={(e) => setTag(e.target.value as ExpenseTag | "")}
          >
            <option value="">Sin etiqueta</option>
            {EXPENSE_TAGS.map((t) => (
              <option key={t} value={t}>
                {EXPENSE_TAG_ICONS[t]} {t}
              </option>
            ))}
          </Select>
        </Field>

        {(mode === "installments" ? catForInstallments : category) ===
          "tarjeta" && (
          <Field label="Tarjeta" hint={cards.length ? undefined : "Cargá tarjetas primero"}>
            <Select value={cardId} onChange={(e) => setCardId(e.target.value)}>
              <option value="">Sin especificar</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field
          label={mode === "installments" ? "Monto por cuota" : "Monto"}
        >
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />
        </Field>

        {mode === "installments" && !isEdit && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Mes de inicio">
                <Input
                  type="month"
                  value={startPeriod}
                  onChange={(e) =>
                    setStartPeriod((e.target.value || period) as Period)
                  }
                />
              </Field>
              <Field label="Cuota N°">
                <Input
                  type="number"
                  min="1"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </Field>
              <Field label="Total cuotas">
                <Input
                  type="number"
                  min="1"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </Field>
            </div>
            {preview && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {preview}. La cuota {current} cae en {periodShortLabel(startPeriod)}.
              </p>
            )}
          </>
        )}

        {mode === "single" && (
          <>
            <Field label="Nota (opcional)">
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            {!isEdit && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Ya está pago
              </label>
            )}
          </>
        )}

        <ErrorText>{error}</ErrorText>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : isEdit ? "Guardar" : "Agregar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
