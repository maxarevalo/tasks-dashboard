"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, Check, Settings2, Database } from "lucide-react";
import { useAction } from "@/features/gastos/use-action";
import { switchProfile } from "@/features/profiles/actions";
import type { ProfileDTO } from "@/lib/profile";

export function ProfileSwitcher({
  profiles,
  activeKey,
}: {
  profiles: ProfileDTO[];
  activeKey: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pending, exec } = useAction();

  const active =
    profiles.find((p) => p.key === activeKey) ?? profiles[0] ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!active) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        title="Perfil de datos"
      >
        <Database className="h-3.5 w-3.5 text-slate-400" />
        <span className="max-w-[8rem] truncate">{active.name}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Perfil de datos
          </p>
          {profiles.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={pending}
              onClick={() => {
                if (p.key === activeKey) return setOpen(false);
                exec(() => switchProfile(p.key), () => setOpen(false));
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
            >
              <Check
                className={`h-3.5 w-3.5 ${
                  p.key === activeKey ? "text-slate-900" : "text-transparent"
                }`}
              />
              <span className="flex-1 truncate">{p.name}</span>
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <Link
            href="/personal/perfiles"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Gestionar perfiles
          </Link>
        </div>
      )}
    </div>
  );
}
