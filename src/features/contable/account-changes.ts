import "server-only";
import { formatMoney, type Currency } from "@/lib/money";
import { RETURN_MODE_LABELS } from "@/lib/rates";
import { dateLabel } from "@/lib/pf";
import { AVAILABILITY_LABELS } from "./types";
import type { Availability, ReturnMode } from "./types";

/** Lo mínimo de una cuenta para describir su configuración. */
type AccountLike = {
  name?: unknown;
  category?: unknown;
  availability?: unknown;
  currency?: unknown;
  balance?: unknown;
  receivesNet?: unknown;
  maturityDate?: unknown;
  return?: { mode?: unknown; annualRatePct?: unknown; monthlyRatePct?: unknown } | null;
};

type Change = { field: string; label: string; from: string; to: string };

/** "TNA 35%", "Tasa mensual 2%", "Sin rendimiento"… */
function returnText(a: AccountLike): string {
  const mode = (a.return?.mode as ReturnMode) ?? "none";
  const annual = Number(a.return?.annualRatePct ?? 0);
  const monthly = Number(a.return?.monthlyRatePct ?? 0);
  if (mode === "tna") return `TNA ${annual}%`;
  if (mode === "tea") return `TEA ${annual}%`;
  if (mode === "monthly") return `Tasa mensual ${monthly}%`;
  return RETURN_MODE_LABELS[mode] ?? String(mode);
}

/** Campos que se siguen en el historial, ya como texto legible. */
function describe(a: AccountLike): Record<string, { label: string; value: string }> {
  const maturity = String(a.maturityDate ?? "");
  return {
    name: { label: "Nombre", value: String(a.name ?? "") },
    category: { label: "Categoría", value: String(a.category ?? "") },
    availability: {
      label: "Disponibilidad",
      value: AVAILABILITY_LABELS[(a.availability as Availability) ?? "inmediata"] ?? "",
    },
    currency: { label: "Moneda", value: String(a.currency ?? "") },
    return: { label: "Rendimiento", value: returnText(a) },
    maturityDate: {
      label: "Vencimiento",
      value: maturity ? dateLabel(maturity) : "",
    },
    receivesNet: {
      label: "Recibe el excedente",
      value: a.receivesNet ? "Sí" : "No",
    },
  };
}

/** Resumen de la cuenta recién creada (todo lo que tiene valor). */
export function creationChanges(a: AccountLike): Change[] {
  const d = describe(a);
  const out: Change[] = Object.entries(d)
    .filter(([, v]) => v.value && v.value !== "No")
    .map(([field, v]) => ({ field, label: v.label, from: "", to: v.value }));
  out.push({
    field: "balance",
    label: "Saldo inicial",
    from: "",
    to: formatMoney(Number(a.balance ?? 0), (a.currency as Currency) ?? "ARS"),
  });
  return out;
}

/** Diferencias de configuración entre dos versiones de la cuenta (sin el saldo). */
export function diffChanges(before: AccountLike, after: AccountLike): Change[] {
  const a = describe(before);
  const b = describe(after);
  return Object.keys(b)
    .filter((k) => a[k].value !== b[k].value)
    .map((k) => ({ field: k, label: b[k].label, from: a[k].value, to: b[k].value }));
}
