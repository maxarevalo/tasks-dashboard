"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Field, Input, Button, ErrorText } from "@/components/ui";
import { useAction } from "@/features/salud/use-action";
import { createWeightEntry } from "@/features/salud/actions";
import { nowLocal } from "@/features/salud/format";

/** Carga rápida del peso: fecha y hora arrancan en "ahora" y se pueden cambiar. */
export function WeightForm({ lastWeight }: { lastWeight: number | null }) {
  const { pending, error, exec } = useAction();
  const [takenAt, setTakenAt] = useState("");
  const [weight, setWeight] = useState("");

  // La hora actual se toma en el navegador (no en el servidor) para que sea la local.
  useEffect(() => {
    setTakenAt(nowLocal()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    exec(
      () => createWeightEntry({ takenAt, weight: Number(weight) }),
      () => {
        setWeight("");
        setTakenAt(nowLocal());
      },
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        Registrar peso
      </h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Field label="Fecha y hora">
          <div className="flex gap-2">
            <Input
              type="datetime-local"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setTakenAt(nowLocal())}
              className="grid w-10 shrink-0 place-items-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              title="Usar fecha y hora actual"
              aria-label="Usar fecha y hora actual"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </Field>
        <Field label="Peso (kg)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="400"
            placeholder={lastWeight != null ? String(lastWeight) : "Ej: 72,5"}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" disabled={pending || !takenAt}>
          <Plus className="h-4 w-4" />
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </form>
  );
}
