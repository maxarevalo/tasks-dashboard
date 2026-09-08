"use client";

import { useState } from "react";
import { Plus, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Button, ErrorText } from "@/components/ui";
import { useAction } from "@/features/gastos/use-action";
import {
  createCard,
  updateCard,
  setCardArchived,
} from "@/features/gastos/actions";
import type { CardDTO } from "@/features/gastos/types";

export function CardManager({ cards }: { cards: CardDTO[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CardDTO | null>(null);
  const { exec } = useAction();

  const active = cards.filter((c) => !c.archived);
  const archived = cards.filter((c) => c.archived);

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
          Nueva tarjeta
        </Button>
      </div>

      {cards.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Todavía no cargaste tarjetas.
        </div>
      )}

      <ul className="space-y-2">
        {[...active, ...archived].map((c) => (
          <li
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  c.archived ? "text-slate-400" : "text-slate-900"
                }`}
              >
                {c.name}
              </p>
              <p className="text-xs text-slate-500">
                {c.closingDay ? `Cierre día ${c.closingDay}` : "Cierre —"} ·{" "}
                {c.dueDay ? `Vence día ${c.dueDay}` : "Vencimiento —"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditing(c);
                setOpen(true);
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => exec(() => setCardArchived(c.id, !c.archived))}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={c.archived ? "Restaurar" : "Archivar"}
            >
              {c.archived ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </button>
          </li>
        ))}
      </ul>

      <CardForm
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
      />
    </div>
  );
}

function CardForm({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: CardDTO | null;
}) {
  const { pending, error, exec, setError } = useAction();
  const [name, setName] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = `${open}-${editing?.id ?? "new"}`;
  if (open && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setName(editing?.name ?? "");
    setClosingDay(editing?.closingDay ? String(editing.closingDay) : "");
    setDueDay(editing?.dueDay ? String(editing.dueDay) : "");
  } else if (!open && syncedFor !== null) {
    setSyncedFor(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      closingDay: closingDay ? Number(closingDay) : undefined,
      dueDay: dueDay ? Number(dueDay) : undefined,
    };
    exec(
      () => (editing ? updateCard(editing.id, payload) : createCard(payload)),
      onClose,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar tarjeta" : "Nueva tarjeta"}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Visa Galicia"
            required
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Día de cierre" hint="Opcional">
            <Input
              type="number"
              min="1"
              max="31"
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
            />
          </Field>
          <Field label="Día de vencimiento" hint="Opcional">
            <Input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
          </Field>
        </div>
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
