/** Etiqueta libre y opcional por gasto (distinta de la categoría/tipo de gasto). */
export const EXPENSE_TAGS = [
  "Supermercado",
  "Obra",
  "Suscripciones",
  "Combustible",
  "Auto",
  "Dardo",
  "Farmacia",
  "Salidas",
  "Servicios",
  "Otros",
] as const;
export type ExpenseTag = (typeof EXPENSE_TAGS)[number];

export const EXPENSE_TAG_ICONS: Record<ExpenseTag, string> = {
  Supermercado: "🛒",
  Obra: "🧱",
  Suscripciones: "🔁",
  Combustible: "⛽",
  Auto: "🚗",
  Dardo: "🐾",
  Farmacia: "💊",
  Salidas: "🍻",
  Servicios: "🧾",
  Otros: "🏷️",
};

/** Color (hex) por etiqueta, para gráficos segmentados. */
export const EXPENSE_TAG_COLORS: Record<ExpenseTag, string> = {
  Supermercado: "#2563eb",
  Obra: "#d97706",
  Suscripciones: "#7c3aed",
  Combustible: "#dc2626",
  Auto: "#0891b2",
  Dardo: "#db2777",
  Farmacia: "#16a34a",
  Salidas: "#ea580c",
  Servicios: "#854d0e",
  Otros: "#475569",
};

/** Color para los gastos sin etiqueta. */
export const UNTAGGED_COLOR = "#cbd5e1";

/** Color de una etiqueta (o de "sin etiqueta" si es null). */
export function tagColor(tag: ExpenseTag | null): string {
  return tag ? EXPENSE_TAG_COLORS[tag] : UNTAGGED_COLOR;
}
