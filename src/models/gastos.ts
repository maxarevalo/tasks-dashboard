import { Schema, model, models, type InferSchemaType } from "mongoose";

export const OWNER_ID = "owner";

export const EXPENSE_CATEGORIES = [
  "tarjeta",
  "prestamo",
  "fijo",
  "previsto",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const CURRENCY_ENUM = ["ARS", "USD"] as const;

/* ------------------------------- Card ---------------------------------- */

const cardSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    name: { type: String, required: true, trim: true },
    closingDay: { type: Number, min: 1, max: 31 },
    dueDay: { type: Number, min: 1, max: 31 },
    color: { type: String },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type CardDoc = InferSchemaType<typeof cardSchema>;
export const Card = models.Card ?? model("Card", cardSchema);

/* ----------------------------- FixedExpense ---------------------------- */

const fixedExpenseSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCY_ENUM, required: true },
    category: {
      type: String,
      enum: ["fijo", "prestamo"],
      default: "fijo",
    },
    cardId: { type: Schema.Types.ObjectId, ref: "Card" },
    startPeriod: { type: String, required: true }, // YYYY-MM
    endPeriod: { type: String, default: null }, // null = indefinido
    active: { type: Boolean, default: true },
    // Si es true, el gasto se materializa solo en cada mes que se visita.
    autoGenerate: { type: Boolean, default: false },
    // Meses (YYYY-MM) en los que este fijo fue quitado a mano.
    skipPeriods: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type FixedExpenseDoc = InferSchemaType<typeof fixedExpenseSchema>;
export const FixedExpense =
  models.FixedExpense ?? model("FixedExpense", fixedExpenseSchema);

/* ------------------------------- Expense ------------------------------- */

const expenseSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    period: { type: String, required: true }, // YYYY-MM
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    description: { type: String, required: true, trim: true },
    // Puede ser negativo: reintegros / ajustes.
    amount: { type: Number, required: true },
    currency: { type: String, enum: CURRENCY_ENUM, required: true },
    cardId: { type: Schema.Types.ObjectId, ref: "Card" },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
    note: { type: String, trim: true },

    source: {
      type: String,
      enum: ["manual", "installment", "fixed"],
      default: "manual",
    },
    // Agrupa las cuotas de una misma compra.
    groupId: { type: String, index: true },
    installment: {
      current: { type: Number },
      total: { type: Number },
    },
    fixedId: { type: Schema.Types.ObjectId, ref: "FixedExpense" },
    // true si la fila (materializada de un fijo) fue editada a mano: no se
    // pisa al propagar cambios de la plantilla.
    overridden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

expenseSchema.index({ userId: 1, period: 1 });
// Evita duplicar el gasto fijo materializado para un mismo mes.
expenseSchema.index(
  { fixedId: 1, period: 1 },
  { unique: true, partialFilterExpression: { fixedId: { $exists: true } } },
);

export type ExpenseDoc = InferSchemaType<typeof expenseSchema>;
export const Expense = models.Expense ?? model("Expense", expenseSchema);
