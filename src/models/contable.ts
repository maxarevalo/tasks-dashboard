import { Schema, model, models, type InferSchemaType } from "mongoose";
import { OWNER_ID } from "./gastos";
import { DOLLAR_TYPES, RATE_BASIS } from "@/lib/exchange";
import { RECURRENCE_FREQUENCIES } from "@/lib/period";

export { OWNER_ID };
export { DOLLAR_TYPES, RATE_BASIS } from "@/lib/exchange";
export type { DollarType, RateBasis } from "@/lib/exchange";

const CURRENCY_ENUM = ["ARS", "USD"] as const;

export const AVAILABILITY = ["inmediata", "corto", "inmovilizada"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const RETURN_MODES = ["none", "tna", "tea", "monthly", "manual"] as const;
export type ReturnMode = (typeof RETURN_MODES)[number];

/* -------------------------- SavingsAccount ---------------------------- */

const savingsAccountSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    name: { type: String, required: true, trim: true },
    /** Categoría libre: "Reserva de emergencia", "Objetivo", "Inversión"… */
    category: { type: String, trim: true, default: "" },
    availability: {
      type: String,
      enum: AVAILABILITY,
      default: "inmediata",
    },
    currency: { type: String, enum: CURRENCY_ENUM, required: true },
    /** Saldo actual. */
    balance: { type: Number, required: true, default: 0 },
    /** Mes (YYYY-MM) al que corresponde el saldo cargado. */
    balanceAsOf: { type: String, required: true },
    /** El excedente del mes (ingresos - gastos) se acumula acá. */
    receivesNet: { type: Boolean, default: false },

    return: {
      mode: { type: String, enum: RETURN_MODES, default: "none" },
      /** Porcentaje anual (ej: 90 = 90%). Para modos tna / tea. */
      annualRatePct: { type: Number, default: 0 },
      /** Porcentaje mensual. Para modo monthly. */
      monthlyRatePct: { type: Number, default: 0 },
    },
    /** Para modo "manual": saldo proyectado cargado a mano por mes. */
    manualProjections: {
      type: [
        {
          _id: false,
          period: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
      default: [],
    },

    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

savingsAccountSchema.index({ userId: 1, archived: 1 });

export type SavingsAccountDoc = InferSchemaType<typeof savingsAccountSchema>;
export const SavingsAccount =
  models.SavingsAccount ?? model("SavingsAccount", savingsAccountSchema);

/* ------------------------------- Income ------------------------------- */

const incomeSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    description: { type: String, required: true, trim: true },
    /** Origen libre: "Sueldo", "Freelance", "Alquiler", "Dividendos"… */
    origin: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCY_ENUM, required: true },
    kind: { type: String, enum: ["recurring", "oneoff"], required: true },
    /** oneoff: mes puntual. */
    period: { type: String },
    /** recurring: rango de vigencia. */
    startPeriod: { type: String },
    endPeriod: { type: String, default: null },
    // "monthly" (default) se cobra todos los meses; "semiannual" cada 6
    // meses desde startPeriod (ej. aguinaldo: junio y diciembre); "annual"
    // solo en el mes de startPeriod, cada 12 meses.
    frequency: {
      type: String,
      enum: RECURRENCE_FREQUENCIES,
      default: "monthly",
    },
    /** false = ingreso "posible" (no confirmado). */
    confirmed: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

incomeSchema.index({ userId: 1, active: 1 });

export type IncomeDoc = InferSchemaType<typeof incomeSchema>;
export const Income = models.Income ?? model("Income", incomeSchema);

/* ---------------------------- ExchangeRate ---------------------------- */

/** Un doc por perfil. Cotización USD/ARS para la vista unificada. */
const exchangeRateSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, unique: true },
    mode: { type: String, enum: ["manual", "api"], default: "manual" },
    /** Valores cargados a mano (ARS por 1 USD). */
    manualBuy: { type: Number, default: 0 },
    manualSell: { type: Number, default: 0 },
    /** Tipo de dólar para el modo API (dolarapi.com). */
    apiType: { type: String, enum: DOLLAR_TYPES, default: "blue" },
    /** Últimos valores traídos de la API. */
    cachedBuy: { type: Number, default: 0 },
    cachedSell: { type: Number, default: 0 },
    fetchedAt: { type: Date },
    /** Qué valor se usa para convertir en la vista unificada. */
    basis: { type: String, enum: RATE_BASIS, default: "promedio" },
  },
  { timestamps: true },
);

export type ExchangeRateDoc = InferSchemaType<typeof exchangeRateSchema>;
export const ExchangeRate =
  models.ExchangeRate ?? model("ExchangeRate", exchangeRateSchema);
