import type { ReturnMode } from "@/models/contable";

export type ReturnConfig = {
  mode: ReturnMode;
  annualRatePct: number;
  monthlyRatePct: number;
};

/**
 * Factor de interés mensual para un modo/tasa dados.
 * - tna: (TNA/12)
 * - tea: (1+TEA)^(1/12) - 1
 * - monthly: la tasa mensual tal cual
 * - none / manual: 0 (manual se resuelve aparte)
 */
export function monthlyReturnRate(cfg: ReturnConfig): number {
  switch (cfg.mode) {
    case "tna":
      return cfg.annualRatePct / 100 / 12;
    case "tea":
      return Math.pow(1 + cfg.annualRatePct / 100, 1 / 12) - 1;
    case "monthly":
      return cfg.monthlyRatePct / 100;
    default:
      return 0;
  }
}

export const RETURN_MODE_LABELS: Record<ReturnMode, string> = {
  none: "Sin rendimiento",
  tna: "TNA (capitaliza mensual)",
  tea: "TEA (efectiva anual)",
  monthly: "Tasa mensual directa",
  manual: "Saldos cargados a mano",
};
