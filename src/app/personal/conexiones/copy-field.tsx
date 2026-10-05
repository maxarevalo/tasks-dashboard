"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
        {value}
      </code>
      <button
        type="button"
        onClick={() =>
          navigator.clipboard
            .writeText(value)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
            .catch(() => {})
        }
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
        aria-label="Copiar dirección"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
