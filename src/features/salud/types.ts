import type { DateStr } from "@/lib/pf";

export type { DateStr };

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Fecha y hora local: "YYYY-MM-DDTHH:mm". */
export type DateTimeStr = string;

export type WeightEntryDTO = {
  id: string;
  takenAt: DateTimeStr;
  /** kg */
  weight: number;
  /** Comentario libre ("" si no tiene). */
  note: string;
  /** Calculado: diferencia contra la medición anterior (null si es la primera). */
  delta: number | null;
};

/** Resumen de una semana (lunes a domingo) con al menos una medición. */
export type WeightWeek = {
  /** Lunes de la semana. */
  start: DateStr;
  /** Domingo de la semana. */
  end: DateStr;
  avg: number;
  min: number;
  max: number;
  count: number;
  /** Diferencia del promedio contra la semana anterior con datos (null si es la primera). */
  delta: number | null;
  /** Semanas entre esta y la anterior con datos (1 = consecutivas). */
  gapWeeks: number | null;
};

/** Hito con fecha que se marca en el gráfico. */
export type WeightMilestoneDTO = {
  id: string;
  date: DateStr;
  label: string;
};

export type WeightOverview = {
  /** Ordenadas de la más reciente a la más antigua. */
  entries: WeightEntryDTO[];
  /** Ordenadas de la más antigua a la más reciente. */
  weeks: WeightWeek[];
  /** Ordenados del más antiguo al más reciente. */
  milestones: WeightMilestoneDTO[];
};
