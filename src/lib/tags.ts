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
  Otros: "🏷️",
};
