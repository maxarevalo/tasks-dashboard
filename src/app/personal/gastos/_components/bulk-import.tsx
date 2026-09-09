"use client";

import { useMemo, useState } from "react";
import { Trash2, ArrowLeft, Upload } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Textarea, Button, ErrorText } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type { Period } from "@/lib/period";
import { useAction } from "@/features/gastos/use-action";
import { createExpensesBulk } from "@/features/gastos/actions";
import { parseBulkText } from "@/features/gastos/parse-bulk";
import type { CardDTO, ExpenseCategory } from "@/features/gastos/types";

type Row = {
  key: number;
  description: string;
  period: Period;
  category: ExpenseCategory;
  currency: "ARS" | "USD";
  cardId: string;
  amount: string;
};

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "tarjeta", label: "Tarjeta" },
  { value: "prestamo", label: "Préstamo" },
  { value: "fijo", label: "Gasto fijo" },
  { value: "previsto", label: "Previsto" },
];

const PLACEHOLDER = `* 07 de septiembre
   * Pagos360*applusiteuvearg
$
97.057,65
   * Los primos
$
15.300,00`;

export function BulkImport({
  open,
  onClose,
  period,
  cards,
}: {
  open: boolean;
  onClose: () => void;
  period: Period;
  cards: CardDTO[];
}) {
  const { pending, error, exec, setError } = useAction();
  const [step, setStep] = useState<"paste" | "review">("paste");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Reset al abrir
  const [syncedOpen, setSyncedOpen] = useState(false);
  if (open && !syncedOpen) {
    setSyncedOpen(true);
    setStep("paste");
    setText("");
    setRows([]);
    setParseError(null);
    setError(null);
  } else if (!open && syncedOpen) {
    setSyncedOpen(false);
  }

  const [bulkCategory, setBulkCategory] = useState<ExpenseCategory>("tarjeta");
  const [bulkCard, setBulkCard] = useState("");

  function doParse() {
    const parsed = parseBulkText(text, period);
    if (parsed.length === 0) {
      setParseError(
        "No se reconoció ningún gasto. Revisá el formato del texto pegado.",
      );
      return;
    }
    setParseError(null);
    setRows(
      parsed.map((p, i) => ({
        key: i,
        description: p.description,
        period: p.period,
        category: bulkCategory,
        currency: p.currency,
        cardId: bulkCategory === "tarjeta" ? bulkCard : "",
        amount: String(p.amount),
      })),
    );
    setStep("review");
  }

  function patch(key: number, next: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...next } : r)));
  }

  function applyToAll() {
    setRows((rs) =>
      rs.map((r) => ({
        ...r,
        category: bulkCategory,
        cardId: bulkCategory === "tarjeta" ? bulkCard : "",
      })),
    );
  }

  const totals = useMemo(() => {
    const t = { ARS: 0, USD: 0 };
    for (const r of rows) {
      const n = Number(r.amount);
      if (Number.isFinite(n)) t[r.currency] += n;
    }
    return t;
  }, [rows]);

  function doImport() {
    const invalid = rows.find(
      (r) => !r.description.trim() || !Number.isFinite(Number(r.amount)) || Number(r.amount) === 0,
    );
    if (invalid) {
      setError(`Revisá "${invalid.description || "(sin descripción)"}": monto o descripción inválidos.`);
      return;
    }
    exec(
      () =>
        createExpensesBulk(
          rows.map((r) => ({
            period: r.period,
            category: r.category,
            description: r.description.trim(),
            amount: Number(r.amount),
            currency: r.currency,
            cardId: r.category === "tarjeta" ? r.cardId : "",
          })),
        ),
      onClose,
    );
  }

  const activeCards = cards.filter((c) => !c.archived);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        step === "paste"
          ? "Importar gastos — pegar texto"
          : `Importar gastos — revisar (${rows.length})`
      }
    >
      {step === "paste" ? (
        <div className="space-y-4">
          <Field
            label="Pegá el texto"
            hint="Un ítem por bloque: descripción, moneda ($ o U$S) y monto. Las líneas “* 07 de septiembre” fijan el mes."
          >
            <Textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              className="font-mono text-xs"
              autoFocus
            />
          </Field>
          <ErrorText>{parseError}</ErrorText>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={doParse} disabled={!text.trim()}>
              Continuar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-medium text-slate-600">
              Aplicar a todos los ítems
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-500">
                Categoría
                <Select
                  value={bulkCategory}
                  onChange={(e) =>
                    setBulkCategory(e.target.value as ExpenseCategory)
                  }
                  className="mt-1"
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </label>
              {bulkCategory === "tarjeta" && (
                <label className="text-xs text-slate-500">
                  Tarjeta
                  <Select
                    value={bulkCard}
                    onChange={(e) => setBulkCard(e.target.value)}
                    className="mt-1"
                  >
                    <option value="">Sin especificar</option>
                    {activeCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </label>
              )}
              <Button type="button" variant="secondary" onClick={applyToAll}>
                Aplicar
              </Button>
            </div>
          </div>

          <ul className="space-y-3">
            {rows.map((r) => {
              const negative = Number(r.amount) < 0;
              return (
                <li
                  key={r.key}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-start gap-2">
                    <input
                      value={r.description}
                      onChange={(e) =>
                        patch(r.key, { description: e.target.value })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setRows((rs) => rs.filter((x) => x.key !== r.key))
                      }
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Quitar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="text-[11px] text-slate-500">
                      Mes
                      <Input
                        type="month"
                        value={r.period}
                        onChange={(e) =>
                          patch(r.key, {
                            period: (e.target.value || period) as Period,
                          })
                        }
                        className="mt-0.5"
                      />
                    </label>
                    <label className="text-[11px] text-slate-500">
                      Categoría
                      <Select
                        value={r.category}
                        onChange={(e) =>
                          patch(r.key, {
                            category: e.target.value as ExpenseCategory,
                          })
                        }
                        className="mt-0.5"
                      >
                        {CATEGORY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="text-[11px] text-slate-500">
                      Moneda
                      <Select
                        value={r.currency}
                        onChange={(e) =>
                          patch(r.key, {
                            currency: e.target.value as "ARS" | "USD",
                          })
                        }
                        className="mt-0.5"
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </Select>
                    </label>
                    <label className="text-[11px] text-slate-500">
                      Monto{negative ? " (reintegro)" : ""}
                      <Input
                        type="number"
                        step="0.01"
                        value={r.amount}
                        onChange={(e) => patch(r.key, { amount: e.target.value })}
                        className={`mt-0.5 ${negative ? "text-emerald-700" : ""}`}
                      />
                    </label>
                  </div>

                  {r.category === "tarjeta" && (
                    <label className="mt-2 block text-[11px] text-slate-500">
                      Tarjeta
                      <Select
                        value={r.cardId}
                        onChange={(e) =>
                          patch(r.key, { cardId: e.target.value })
                        }
                        className="mt-0.5"
                      >
                        <option value="">Sin especificar</option>
                        {activeCards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </label>
                  )}
                </li>
              );
            })}
          </ul>

          {rows.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
              No quedan ítems. Volvé y pegá el texto de nuevo.
            </p>
          )}

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Total a importar: </span>
            <span className="font-semibold text-slate-900">
              {formatMoney(totals.ARS, "ARS")}
            </span>
            {totals.USD !== 0 && (
              <>
                {" · "}
                <span className="font-semibold text-slate-900">
                  {formatMoney(totals.USD, "USD")}
                </span>
              </>
            )}
          </div>

          <ErrorText>{error}</ErrorText>

          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep("paste")}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button
              type="button"
              onClick={doImport}
              disabled={pending || rows.length === 0}
            >
              <Upload className="h-4 w-4" />
              {pending ? "Importando…" : `Importar ${rows.length}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
