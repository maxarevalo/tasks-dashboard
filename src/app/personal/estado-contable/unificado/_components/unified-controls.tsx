"use client";

import { useRouter } from "next/navigation";
import type { Currency } from "@/lib/money";

const HORIZONS = [3, 6, 12, 24];

export function UnifiedControls({
  currency,
  horizon,
}: {
  currency: Currency;
  horizon: number;
}) {
  const router = useRouter();
  const go = (en: Currency, h: number) =>
    router.push(`/personal/estado-contable/unificado?en=${en}&h=${h}`);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Ver todo en</p>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {(["ARS", "USD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => go(c, horizon)}
              className={`rounded-md px-4 py-1.5 font-medium transition-colors ${
                currency === c
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Proyección</p>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {HORIZONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => go(currency, n)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                horizon === n
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {n}m
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
