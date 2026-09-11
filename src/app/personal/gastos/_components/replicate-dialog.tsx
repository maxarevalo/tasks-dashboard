"use client";

import { useState } from "react";
import { CopyPlus } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button, ErrorText } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { useAction } from "@/features/gastos/use-action";
import { replicateSelected } from "@/features/gastos/actions";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type ExpenseDTO,
} from "@/features/gastos/types";

const defaultSelection = (items: ExpenseDTO[]) =>
  new Set(items.filter((e) => e.category === "fijo").map((e) => e.id));

export function ReplicateDialog({
  open,
  onClose,
  nextLabel,
  items,
}: {
  open: boolean;
  onClose: () => void;
  nextLabel: string;
  items: ExpenseDTO[];
}) {
  const { pending, error, exec, setError } = useAction();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${items.map((e) => e.id).join(",")}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setSelected(defaultSelection(items));
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    rows: items.filter((e) => e.category === cat),
  })).filter((g) => g.rows.length > 0);

  function submit() {
    exec(() => replicateSelected([...selected]), onClose);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Replicar a ${nextLabel}`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Los gastos fijos vienen tildados por defecto. Los que ya tengan su
            réplica no aparecen acá.
          </p>
          <div className="flex shrink-0 gap-3 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setSelected(new Set(items.map((e) => e.id)))}
              className="underline-offset-2 hover:underline"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="underline-offset-2 hover:underline"
            >
              Ninguno
            </button>
          </div>
        </div>

        {grouped.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
            No hay gastos para replicar en este mes.
          </p>
        ) : (
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {grouped.map(({ cat, rows }) => (
              <section key={cat}>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {CATEGORY_LABELS[cat]}
                </h4>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                  {rows.map((e) => (
                    <li key={e.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selected.has(e.id)}
                          onChange={() => toggle(e.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-slate-800">
                            {e.description}
                          </span>
                          {e.cardName && (
                            <span className="text-xs text-slate-400">
                              {e.cardName}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-slate-700">
                          {formatMoney(e.amount, e.currency)}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <ErrorText>{error}</ErrorText>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={submit}
          >
            <CopyPlus className="h-4 w-4" />
            {pending ? "Replicando…" : `Replicar ${selected.size}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
