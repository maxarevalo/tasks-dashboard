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
    /** Comentario libre opcional (ej. "después de cenar afuera"). */
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

weightEntrySchema.index({ userId: 1, takenAt: 1 });

export type WeightEntryDoc = InferSchemaType<typeof weightEntrySchema>;
export const WeightEntry =
  models.WeightEntry ?? model("WeightEntry", weightEntrySchema);

/* ---------------------------- WeightMilestone ---------------------------- */

/** Hito con fecha para marcar en el gráfico (ej. "Inicio de gym", "Viaje"). */
const weightMilestoneSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    /** "YYYY-MM-DD" */
    date: { type: String, required: true },
    label: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

weightMilestoneSchema.index({ userId: 1, date: 1 });

export type WeightMilestoneDoc = InferSchemaType<typeof weightMilestoneSchema>;
export const WeightMilestone =
  models.WeightMilestone ?? model("WeightMilestone", weightMilestoneSchema);

/* ------------------------------ GlucoseEntry ----------------------------- */

const glucoseEntrySchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    /** Fecha y hora local de la medición: "YYYY-MM-DDTHH:mm". */
    takenAt: { type: String, required: true },
    /** Glucosa en sangre, en mg/dL. */
    value: { type: Number, required: true, min: 0 },
    /** Momento de la medición: "Ayunas" por defecto, o texto libre. */
    context: { type: String, trim: true, default: "Ayunas" },
  },
  { timestamps: true },
);

glucoseEntrySchema.index({ userId: 1, takenAt: 1 });

export const GlucoseEntry =
  models.GlucoseEntry ?? model("GlucoseEntry", glucoseEntrySchema);
