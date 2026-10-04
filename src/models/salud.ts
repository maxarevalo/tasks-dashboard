import { Schema, model, models, type InferSchemaType } from "mongoose";
import { OWNER_ID } from "./gastos";

export { OWNER_ID };

/* ------------------------------ WeightEntry ------------------------------ */

const weightEntrySchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    /** Fecha y hora local de la medición: "YYYY-MM-DDTHH:mm". */
    takenAt: { type: String, required: true },
    /** Peso en kg. */
    weight: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

weightEntrySchema.index({ userId: 1, takenAt: 1 });

export type WeightEntryDoc = InferSchemaType<typeof weightEntrySchema>;
export const WeightEntry =
  models.WeightEntry ?? model("WeightEntry", weightEntrySchema);
