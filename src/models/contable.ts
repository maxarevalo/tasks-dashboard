import { Schema, model, models, type InferSchemaType } from "mongoose";
import { OWNER_ID } from "./gastos";

export { OWNER_ID };

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
    /** false = ingreso "posible" (no confirmado). */
    confirmed: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

incomeSchema.index({ userId: 1, active: 1 });

export type IncomeDoc = InferSchemaType<typeof incomeSchema>;
export const Income = models.Income ?? model("Income", incomeSchema);
