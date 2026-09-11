import { Schema, model, models, type InferSchemaType } from "mongoose";
import { OWNER_ID } from "./gastos";

export { OWNER_ID };

const CURRENCY_ENUM = ["ARS", "USD"] as const;

/* ------------------------------ PlazoFijo ------------------------------- */

const pfMovementSchema = new Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    description: { type: String, trim: true, default: "" },
    /** Positivo = depósito, negativo = retiro. */
    amount: { type: Number, required: true },
  },
  { timestamps: true },
);

const plazoFijoSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    description: { type: String, trim: true, default: "" },
    currency: { type: String, enum: CURRENCY_ENUM, required: true },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    termDays: { type: Number, required: true, min: 1 },
    /** Capital con el que arranca el plazo. */
    principal: { type: Number, required: true, min: 0 },
    /** Tasa nominal anual, en porcentaje (ej: 40 = 40%). */
    tna: { type: Number, required: true, min: 0 },
    /** Depósitos/retiros durante el plazo, con fecha: ajustan el cálculo real. */
    movements: { type: [pfMovementSchema], default: [] },
    /** true si ya se renovó (dio origen a un nuevo ciclo): queda de solo lectura. */
    renewed: { type: Boolean, default: false },
    /** Si este ciclo nace de una renovación, referencia al plazo anterior. */
    renewedFromId: { type: Schema.Types.ObjectId, ref: "PlazoFijo", default: null },
  },
  { timestamps: true },
);

plazoFijoSchema.index({ userId: 1, startDate: 1 });

export type PlazoFijoDoc = InferSchemaType<typeof plazoFijoSchema>;
export const PlazoFijo =
  models.PlazoFijo ?? model("PlazoFijo", plazoFijoSchema);
