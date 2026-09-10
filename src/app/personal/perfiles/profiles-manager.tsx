"use client";

import { useState } from "react";
import {
  Plus,
  Check,
  Pencil,
  Copy,
  Trash2,
  Database,
} from "lucide-react";
import { Modal } from "@/components/modal";
import { Field, Input, Button, ErrorText } from "@/components/ui";
import { useAction } from "@/features/gastos/use-action";
import {
  switchProfile,
  createProfile,
  renameProfile,
  duplicateProfile,
  deleteProfile,
} from "@/features/profiles/actions";
import type { ProfileDTO } from "@/lib/profile";

type Dialog =
  | { kind: "create" }
  | { kind: "rename"; profile: ProfileDTO }
  | { kind: "duplicate"; profile: ProfileDTO }
  | null;

export function ProfilesManager({
  profiles,
  activeKey,
}: {
  profiles: ProfileDTO[];
  activeKey: string;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const { pending, exec } = useAction();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialog({ kind: "create" })}>
          <Plus className="h-4 w-4" />
          Nuevo perfil
        </Button>
      </div>

      <ul className="space-y-2">
        {profiles.map((p) => {
          const isActive = p.key === activeKey;
          return (
            <li
              key={p.key}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                isActive
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                  isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Database className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  {p.name}
                  {isActive && (
                    <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                      Activo
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">clave: {p.key}</p>
              </div>

              {!isActive && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => exec(() => switchProfile(p.key))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  Usar
                </button>
              )}
              <button
                type="button"
                onClick={() => setDialog({ kind: "rename", profile: p })}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Renombrar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: "duplicate", profile: p })}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Duplicar"
                title="Duplicar (copia todos los datos)"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={pending || profiles.length <= 1}
                onClick={() => {
                  if (
                    confirm(
                      `¿Borrar el perfil "${p.name}" y TODOS sus datos (gastos, ahorros, ingresos)? No se puede deshacer.`,
                    )
                  ) {
                    exec(() => deleteProfile(p.id));
                  }
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                aria-label="Borrar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Cada perfil es un conjunto de datos separado (gastos, tarjetas, gastos
        fijos, ahorros e ingresos) sobre la misma base. Cambiás de perfil desde
        acá o desde el selector de la barra superior.
      </p>

      <NameDialog
        dialog={dialog}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function NameDialog({
  dialog,
  onClose,
}: {
  dialog: Dialog;
  onClose: () => void;
}) {
  const { pending, error, exec, setError } = useAction();
  const [name, setName] = useState("");

  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const key = dialog
    ? `${dialog.kind}-${"profile" in dialog ? dialog.profile.id : "new"}`
    : "closed";
  if (dialog && syncedFor !== key) {
    setSyncedFor(key);
    setError(null);
    setName(
      dialog.kind === "rename"
        ? dialog.profile.name
        : dialog.kind === "duplicate"
          ? `${dialog.profile.name} (copia)`
          : "",
    );
  } else if (!dialog && syncedFor !== "closed") {
    setSyncedFor("closed");
  }

  if (!dialog) return null;

  const titles = {
    create: "Nuevo perfil",
    rename: "Renombrar perfil",
    duplicate: "Duplicar perfil",
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dialog) return;
    const run =
      dialog.kind === "create"
        ? () => createProfile(name)
        : dialog.kind === "rename"
          ? () => renameProfile(dialog.profile.id, name)
          : () => duplicateProfile(dialog.profile.id, name);
    exec(run, onClose);
  }

  return (
    <Modal open onClose={onClose} title={titles[dialog.kind]}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Nombre"
          hint={
            dialog.kind === "duplicate"
              ? "Se copian todos los datos del perfil de origen."
              : undefined
          }
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Datos reales, Ficticio, Prueba…"
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
