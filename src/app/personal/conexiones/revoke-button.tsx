"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeClient } from "@/features/mcp/connections";

/** Revocar con confirmación en dos pasos (el visor no muestra confirm()). */
export function RevokeButton({ clientId }: { clientId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Revocar
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-slate-500 hover:text-slate-900"
      >
        Cancelar
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await revokeClient(clientId);
            router.refresh();
          })
        }
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "Revocando…" : "Confirmar"}
      </button>
    </div>
  );
}
