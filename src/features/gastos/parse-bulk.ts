import type { Currency } from "@/lib/money";
import { addMonths, isValidPeriod, type Period } from "@/lib/period";
import type { ExpenseCategory } from "./types";

export type ParsedItem = {
  description: string;
  amount: number;
  currency: Currency;
  period: Period;
  /** Solo del formato JSON: sugerencias para el paso de revisión. */
  category?: ExpenseCategory;
  cardHint?: string;
  paid?: boolean;
};

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

/** "* 07 de septiembre" -> mes 9 */
function parseDateHeader(line: string): number | null {
  const m = norm(line).match(/^\*+\s*(\d{1,2})\s+de\s+([a-z]+)/);
  if (!m) return null;
  return MONTHS[m[2]] ?? null;
}

/** Línea de moneda: "$", "U$S", "US$", "USD", "ARS"… */
function parseCurrencyLine(line: string): Currency | null {
  const t = norm(line).replace(/\s+/g, "");
  if (!t) return null;
  if (["u$s", "us$", "usd", "u$d", "dolares", "dolar"].includes(t)) return "USD";
  if (["$", "ars", "ar$", "pesos"].includes(t)) return "ARS";
  return null;
}

/** "97.057,65" / "-23.999,00" / "1,99" / "15.300" -> número (formato AR) */
function parseAmountLine(line: string): number | null {
  const t = line.trim().replace(/\s+/g, "");
  if (!/^-?[\d.]+(,\d+)?$/.test(t) || !/\d/.test(t)) return null;

  let clean: string;
  if (t.includes(",")) {
    // coma = decimal, puntos = miles
    clean = t.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    // solo puntos en grupos de 3 => separador de miles
    clean = t.replace(/\./g, "");
  } else {
    clean = t; // número simple, punto = decimal
  }
  const n = Number(clean);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function isDescriptionLine(line: string): string | null {
  const m = line.match(/^\s*\*+\s*(.+?)\s*$/);
  return m ? m[1] : null;
}

/* ----------------------------- Formato JSON --------------------------- */

const CATEGORY_ALIASES: Record<string, ExpenseCategory> = {
  tarjeta: "tarjeta",
  tarjetas: "tarjeta",
  card: "tarjeta",
  credito: "tarjeta",
  prestamo: "prestamo",
  prestamos: "prestamo",
  loan: "prestamo",
  fijo: "fijo",
  fijos: "fijo",
  "gasto fijo": "fijo",
  previsto: "previsto",
  previstos: "previsto",
  proyectado: "previsto",
};

function coerceCurrency(v: unknown): Currency | undefined {
  if (typeof v !== "string") return undefined;
  const t = norm(v).replace(/\s+/g, "");
  if (["usd", "u$s", "us$", "u$d", "dolar", "dolares"].includes(t)) return "USD";
  if (["ars", "$", "ar$", "peso", "pesos"].includes(t)) return "ARS";
  return undefined;
}

function coerceAmount(v: unknown): number | null {
  if (typeof v === "number") {
    return Number.isFinite(v) && v !== 0 ? v : null;
  }
  if (typeof v === "string") {
    const ar = parseAmountLine(v);
    if (ar != null) return ar;
    const n = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) && n !== 0 ? n : null;
  }
  return null;
}

function coercePeriod(v: unknown, fallback: Period): Period {
  if (typeof v === "string") {
    const m = v.match(/(\d{4})-(\d{2})/);
    if (m && isValidPeriod(`${m[1]}-${m[2]}`)) return `${m[1]}-${m[2]}`;
  }
  return fallback;
}

const first = (o: Record<string, unknown>, keys: string[]): unknown => {
  for (const k of keys) if (o[k] != null) return o[k];
  return undefined;
};

/**
 * Formato recomendado: un array JSON.
 * `[{ "desc": "...", "amount": 1234.5, "currency": "ARS",
 *     "category": "tarjeta", "card": "Visa Galicia",
 *     "month": "2026-09", "paid": false }, ...]`
 * Casi todo es opcional salvo `desc` y `amount` (admite negativo).
 * Devuelve null si el texto no es un JSON de items válido.
 */
export function parseBulkJson(
  text: string,
  fallbackPeriod: Period,
): ParsedItem[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const arr = Array.isArray(data) ? data : [data];
  const out: ParsedItem[] = [];

  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;

    const description = String(
      first(o, ["desc", "description", "descripcion", "detalle", "name"]) ?? "",
    ).trim();
    const amount = coerceAmount(
      first(o, ["amount", "monto", "importe", "value"]),
    );
    if (!description || amount == null) continue;

    const currency =
      coerceCurrency(first(o, ["currency", "moneda"])) ?? "ARS";
    const period = coercePeriod(
      first(o, ["month", "period", "mes", "fecha", "date"]),
      fallbackPeriod,
    );
    const catRaw = first(o, ["category", "categoria", "tipo"]);
    const category =
      typeof catRaw === "string" ? CATEGORY_ALIASES[norm(catRaw)] : undefined;
    const cardRaw = first(o, ["card", "tarjeta"]);
    const cardHint =
      typeof cardRaw === "string" && cardRaw.trim() ? cardRaw.trim() : undefined;
    const paidRaw = first(o, ["paid", "pagado"]);
    const paid = typeof paidRaw === "boolean" ? paidRaw : undefined;

    out.push({ description, amount, currency, period, category, cardHint, paid });
  }

  return out.length ? out : null;
}

/**
 * Convierte el texto pegado (formato tipo resumen de tarjeta) en items.
 * `fallbackPeriod` es el mes al que van los items sin fecha reconocible.
 */
export function parseBulkText(
  text: string,
  fallbackPeriod: Period,
): ParsedItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const fallbackYear = Number(fallbackPeriod.slice(0, 4));

  const periodForMonth = (month: number): Period => {
    const mm = String(month).padStart(2, "0");
    let candidate = `${fallbackYear}-${mm}`;
    // No importamos meses futuros: si da adelante, es del año pasado.
    if (candidate > fallbackPeriod && candidate > addMonths(fallbackPeriod, 1)) {
      candidate = `${fallbackYear - 1}-${mm}`;
    }
    return isValidPeriod(candidate) ? candidate : fallbackPeriod;
  };

  let currentPeriod = fallbackPeriod;
  const items: ParsedItem[] = [];
  let pending:
    | { description: string; currency: Currency; amount: number | null }
    | null = null;

  const flush = () => {
    if (pending && pending.amount != null) {
      items.push({
        description: pending.description,
        amount: pending.amount,
        currency: pending.currency,
        period: currentPeriod,
      });
    }
    pending = null;
  };

  for (const line of lines) {
    const month = parseDateHeader(line);
    if (month) {
      flush();
      currentPeriod = periodForMonth(month);
      continue;
    }

    const cur = parseCurrencyLine(line);
    if (cur && pending) {
      pending.currency = cur;
      continue;
    }

    const amount = parseAmountLine(line);
    if (amount != null && pending && pending.amount == null) {
      pending.amount = amount;
      continue;
    }

    const desc = isDescriptionLine(line);
    if (desc && !parseCurrencyLine(desc)) {
      flush();
      pending = { description: desc, currency: "ARS", amount: null };
      continue;
    }
    // cualquier otra línea (estados como "Pendiente", etc.) se ignora
  }
  flush();

  return items;
}
