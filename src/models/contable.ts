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

    /** Vencimiento (YYYY-MM-DD) de una cuenta remunerada; "" si no tiene. */
    maturityDate: { type: String, default: "" },

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

/* --------------------------- AccountMovement --------------------------- */

export const MOVEMENT_KINDS = ["pago", "cobro", "ajuste", "transferencia"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

/**
 * Entrada o salida de plata de una cuenta de ahorro: el pago de un gasto, el
 * cobro de un ingreso o un ajuste manual del saldo. El saldo de la cuenta ya
 * incluye el movimiento (se aplica con $inc al crearlo y se revierte al borrarlo).
 */
const accountMovementSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    accountId: { type: Schema.Types.ObjectId, ref: "SavingsAccount", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    /** Positivo = entra plata, negativo = sale. */
    amount: { type: Number, required: true },
    kind: { type: String, enum: MOVEMENT_KINDS, required: true },
    description: { type: String, trim: true, default: "" },
    /** Gasto pagado con este movimiento (kind "pago"). */
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense", default: null },
    /** Cobro de ingreso al que pertenece (kind "cobro"). */
    receiptId: { type: Schema.Types.ObjectId, ref: "IncomeReceipt", default: null },
    /** Une las dos patas (salida y entrada) de una transferencia entre cuentas. */
    transferId: { type: String, default: null },
  },
  { timestamps: true },
);

accountMovementSchema.index({ userId: 1, accountId: 1, date: -1 });
accountMovementSchema.index({ userId: 1, expenseId: 1 });

export type AccountMovementDoc = InferSchemaType<typeof accountMovementSchema>;
export const AccountMovement =
  models.AccountMovement ?? model("AccountMovement", accountMovementSchema);

/* ---------------------------- IncomeReceipt ---------------------------- */

/**
 * Cobro real de un ingreso en un mes: el monto efectivamente cobrado (puede
 * diferir del estimado). Se reparte en una o más cuentas como movimientos
 * "cobro". Un mes con cobro deja de sumar el ingreso estimado en la proyección.
 */
const incomeReceiptSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    incomeId: { type: Schema.Types.ObjectId, ref: "Income", required: true },
    period: { type: String, required: true }, // YYYY-MM
    date: { type: String, required: true }, // YYYY-MM-DD
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCY_ENUM, required: true },
  },
  { timestamps: true },
);

incomeReceiptSchema.index({ userId: 1, incomeId: 1, period: 1 }, { unique: true });

export type IncomeReceiptDoc = InferSchemaType<typeof incomeReceiptSchema>;
export const IncomeReceipt =
  models.IncomeReceipt ?? model("IncomeReceipt", incomeReceiptSchema);

/* ---------------------------- Reconciliation --------------------------- */

/**
 * Cierre de mes: foto de lo que decía la app y lo que había de verdad en cada
 * cuenta. Las diferencias ya quedaron aplicadas como movimientos (gasto "No
 * registrado" o ajuste); esto es el registro para el historial.
 */
const reconciliationSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    period: { type: String, required: true }, // YYYY-MM
    date: { type: String, required: true }, // YYYY-MM-DD
    items: {
      type: [
        {
          _id: false,
          accountId: { type: Schema.Types.ObjectId, ref: "SavingsAccount" },
          name: { type: String },
          currency: { type: String, enum: CURRENCY_ENUM },
          appBalance: { type: Number },
          realBalance: { type: Number },
          /** Cómo se registró la diferencia. */
          mode: { type: String, enum: ["gasto", "ajuste", "igual"] },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export type ReconciliationDoc = InferSchemaType<typeof reconciliationSchema>;
export const Reconciliation =
  models.Reconciliation ?? model("Reconciliation", reconciliationSchema);
