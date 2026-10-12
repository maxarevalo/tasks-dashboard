"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Field, Input, Button, ErrorText } from "@/components/ui";
import { useAction } from "@/features/salud/use-action";
import { createGlucoseEntry } from "@/features/salud/actions";
import { nowLocal } from "@/features/salud/format";
import { DEFAULT_CONTEXT, GLUCOSE_CONTEXTS } from "./contexts";

/** Carga rápida: fecha y hora arrancan en "ahora" y la descripción en "Ayunas". */
export function GlucoseForm() {
  const { pending, error, exec } = useAction();
  const [takenAt, setTakenAt] = useState("");
  const [value, setValue] = useState("");
  const [context, setContext] = useState(DEFAULT_CONTEXT);

  // La hora actual se toma en el navegador (no en el servidor) para que sea la local.
  useEffect(() => {
    setTakenAt(nowLocal()); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    exec(
      () => createGlucoseEntry({ takenAt, value: Number(value), context }),
      () => {
        setValue("");
        setContext(DEFAULT_CONTEXT);
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
        Registrar glucosa
      </h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem_12rem_auto] sm:items-end">
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
        <Field label="Glucosa (mg/dL)">
          <Input
            type="number"
            inputMode="numeric"
            step="1"
            min="20"
            max="600"
            placeholder="Ej: 95"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </Field>
        <Field label="Descripción">
          <Input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            list="glucose-contexts"
            maxLength={60}
            placeholder={DEFAULT_CONTEXT}
          />
        </Field>
        <Button type="submit" disabled={pending || !takenAt}>
          <Plus className="h-4 w-4" />
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      <datalist id="glucose-contexts">
        {GLUCOSE_CONTEXTS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </form>
  );
}
