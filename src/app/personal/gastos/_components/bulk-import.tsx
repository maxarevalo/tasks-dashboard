"use client";

import { useMemo, useState } from "react";
import { Trash2, ArrowLeft, Upload } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Select, Textarea, Button, ErrorText } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type { Period } from "@/lib/period";
import { useAction } from "@/features/gastos/use-action";
import { createExpensesBulk } from "@/features/gastos/actions";
import {
  parseBulkText,
  parseBulkJson,
  type ParsedItem,
} from "@/features/gastos/parse-bulk";
import type { CardDTO, ExpenseCategory } from "@/features/gastos/types";

type Row = {
  key: number;
  description: string;
  period: Period;
  category: ExpenseCategory;
  currency: "ARS" | "USD";
  cardId: string;
  amount: string;
  paid: boolean;
};

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "tarjeta", label: "Tarjeta" },
  { value: "prestamo", label: "Préstamo" },
  { value: "fijo", label: "Gasto fijo" },
  { value: "previsto", label: "Previsto" },
];

const JSON_EXAMPLE = `[
  { "desc": "Pagos360 applus", "amount": 97057.65, "category": "tarjeta", "card": "Visa Galicia" },
  { "desc": "Los primos", "amount": 15300, "month": "2026-09" },
  { "desc": "Google Cloud", "amount": 1.99, "currency": "USD" },
  { "desc": "Reintegro Disney", "amount": -23999, "paid": true }
]`;

const PLACEHOLDER = `Pegá un array JSON (recomendado) o el texto del resumen.

${JSON_EXAMPLE}`;

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
    const trimmed = text.trim();
    const looksJson = trimmed.startsWith("[") || trimmed.startsWith("{");

    let parsed: ParsedItem[];
    if (looksJson) {
      const res = parseBulkJson(text, period);
      if (!res) {
        setParseError(
          "El JSON no es válido o ningún objeto tiene descripción y monto.",
        );
        return;
      }
      parsed = res;
    } else {
      parsed = parseBulkText(text, period);
      if (parsed.length === 0) {
        setParseError(
          "No se reconoció ningún gasto. Probá con el formato JSON.",
        );
        return;
      }
    }

    const cardByName = new Map(
      cards.map((c) => [c.name.trim().toLowerCase(), c.id]),
    );

    setParseError(null);
    setRows(
      parsed.map((p, i) => {
        const category = p.category ?? bulkCategory;
        const hintedCard = p.cardHint
          ? (cardByName.get(p.cardHint.toLowerCase()) ?? "")
          : bulkCard;
        return {
          key: i,
          description: p.description,
          period: p.period,
          category,
          currency: p.currency,
          cardId: category === "tarjeta" ? hintedCard : "",
          amount: String(p.amount),
          paid: p.paid ?? false,
        };
      }),
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
            paid: r.paid,
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
          ? "Importar gastos"
          : `Importar gastos — revisar (${rows.length})`
      }
    >
      {step === "paste" ? (
        <div className="space-y-4">
          <Field
            label="Pegá un array JSON o el texto del resumen"
            hint="JSON: campos desc y amount obligatorios; currency, category, card, month y paid son opcionales."
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

          <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">
              Formato JSON recomendado
            </summary>
            <div className="mt-2 space-y-2">
              <p>
                Array de objetos. <code>desc</code> y <code>amount</code> son lo
                único obligatorio. <code>amount</code> admite negativos
                (reintegros).
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>
                  <code>currency</code>: <code>&quot;ARS&quot;</code> |{" "}
                  <code>&quot;USD&quot;</code> (default ARS)
                </li>
                <li>
                  <code>category</code>: <code>tarjeta</code> | <code>prestamo</code>{" "}
                  | <code>fijo</code> | <code>previsto</code>
                </li>
                <li>
                  <code>card</code>: nombre de la tarjeta tal cual está cargada
                </li>
                <li>
                  <code>month</code>: <code>&quot;YYYY-MM&quot;</code> (o una
                  fecha completa; default: el mes que estás viendo)
                </li>
                <li>
                  <code>paid</code>: <code>true</code> / <code>false</code>
                </li>
              </ul>
              <pre className="overflow-x-auto rounded bg-white p-2 text-[11px] leading-relaxed text-slate-700">
                {JSON_EXAMPLE}
              </pre>
              <button
                type="button"
                onClick={() => setText(JSON_EXAMPLE)}
                className="font-medium text-slate-700 underline underline-offset-2"
              >
                Usar este ejemplo
              </button>
            </div>
          </details>

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

                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    {r.category === "tarjeta" && (
                      <label className="flex-1 text-[11px] text-slate-500">
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
                    <label className="flex items-center gap-1.5 py-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={r.paid}
                        onChange={(e) => patch(r.key, { paid: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Ya pagado
                    </label>
                  </div>
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
