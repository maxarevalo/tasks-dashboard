"use client";

import { useRouter } from "next/navigation";

const OPTIONS = [6, 12, 24];

export function HorizonSelector({ value }: { value: number }) {
  const router = useRouter();
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
      {OPTIONS.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => router.push(`/personal/estado-contable?h=${n}`)}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
            value === n
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {n} meses
        </button>
      ))}
    </div>
  );
}
