import type { Currency } from "@/lib/money";

export const DOLLAR_TYPES = [
  "oficial",
  "blue",
  "mep",
  "cripto",
  "tarjeta",
  "mayorista",
] as const;
export type DollarType = (typeof DOLLAR_TYPES)[number];

export const RATE_BASIS = ["compra", "venta", "promedio"] as const;
export type RateBasis = (typeof RATE_BASIS)[number];

export const DOLLAR_TYPE_LABELS: Record<DollarType, string> = {
  oficial: "Oficial",
  blue: "Blue",
  mep: "MEP / Bolsa",
  cripto: "Cripto",
  tarjeta: "Tarjeta",
  mayorista: "Mayorista",
};

export const RATE_BASIS_LABELS: Record<RateBasis, string> = {
  compra: "Compra",
  venta: "Venta",
  promedio: "Promedio compra/venta",
};

/** ARS por 1 USD, efectivos + el valor usado para convertir. */
export function effectiveRate(r: {
  mode: "manual" | "api";
  manualBuy: number;
  manualSell: number;
  cachedBuy: number;
  cachedSell: number;
  basis: RateBasis;
}): { buy: number; sell: number; value: number; ready: boolean } {
  const buy = r.mode === "api" ? r.cachedBuy : r.manualBuy;
  const sell = r.mode === "api" ? r.cachedSell : r.manualSell;
  const b = buy > 0 ? buy : sell;
  const s = sell > 0 ? sell : buy;
  const value =
    r.basis === "compra" ? b : r.basis === "venta" ? s : (b + s) / 2;
  return { buy: b, sell: s, value, ready: value > 0 };
}

/** Convierte `amount` de `from` a la moneda `to` usando `rate` (ARS por USD). */
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rate: number,
): number {
  if (from === to) return amount;
  if (from === "USD" && to === "ARS") return amount * rate;
  if (from === "ARS" && to === "USD") return rate > 0 ? amount / rate : 0;
  return amount;
}

const DOLARAPI: Record<DollarType, string> = {
  oficial: "https://dolarapi.com/v1/dolares/oficial",
  blue: "https://dolarapi.com/v1/dolares/blue",
  mep: "https://dolarapi.com/v1/dolares/bolsa",
  cripto: "https://dolarapi.com/v1/dolares/cripto",
  tarjeta: "https://dolarapi.com/v1/dolares/tarjeta",
  mayorista: "https://dolarapi.com/v1/dolares/mayorista",
};

/** Trae compra/venta de dolarapi.com. Devuelve null si falla. */
export async function fetchDollar(
  type: DollarType,
): Promise<{ buy: number; sell: number } | null> {
  try {
    const res = await fetch(DOLARAPI[type], {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { compra?: number; venta?: number };
    const sell = Number(data.venta) || 0;
    const buy = Number(data.compra) || sell;
    if (sell <= 0 && buy <= 0) return null;
    return { buy: buy || sell, sell: sell || buy };
  } catch {
    return null;
  }
}
