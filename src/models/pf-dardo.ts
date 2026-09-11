import { Schema, model, models, type InferSchemaType } from "mongoose";
import { OWNER_ID } from "./gastos";

export { OWNER_ID };

const CURRENCY_ENUM = ["ARS", "USD"] as const;

/* ------------------------------ PlazoFijo ------------------------------- */

const plazoFijoSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    description: { type: String, trim: true, default: "" },
    currency: { type: String, enum: CURRENCY_ENUM, required: true },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    termDays: { type: Number, required: true, min: 1 },
    principal: { type: Number, required: true, min: 0 },
    /** Tasa nominal anual, en porcentaje (ej: 40 = 40%). */
    tna: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

plazoFijoSchema.index({ userId: 1, startDate: 1 });

export type PlazoFijoDoc = InferSchemaType<typeof plazoFijoSchema>;
export const PlazoFijo =
  models.PlazoFijo ?? model("PlazoFijo", plazoFijoSchema);

/* ----------------------------- PfMovement ------------------------------- */

const pfMovementSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    description: { type: String, required: true, trim: true },
    currency: { type: String, enum: CURRENCY_ENUM, required: true },
    /** Positivo = ingreso, negativo = egreso. */
    amount: { type: Number, required: true },
  },
  { timestamps: true },
);

pfMovementSchema.index({ userId: 1, date: 1 });

export type PfMovementDoc = InferSchemaType<typeof pfMovementSchema>;
export const PfMovement =
  models.PfMovement ?? model("PfMovement", pfMovementSchema);
