import { Loader2 } from "lucide-react";

/**
 * Esqueleto que se muestra mientras carga una página (lo usan los loading.tsx).
 * Aparece apenas se navega, así siempre hay una señal de que la app respondió.
 */
export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Cargando…</span>
      <div className="mb-6 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
        <div className="space-y-2 pt-1">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="h-3 w-64 max-w-full rounded bg-slate-200" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white p-5">
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="mt-3 h-6 w-28 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="mt-4 h-72 rounded-xl border border-slate-200 bg-white p-5">
        <div className="h-3 w-32 rounded bg-slate-200" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 rounded bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
