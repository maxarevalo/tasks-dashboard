import { Schema, model, models, type InferSchemaType } from "mongoose";
import { OWNER_ID } from "./gastos";

export { OWNER_ID };

const CURRENCY_ENUM = ["ARS", "USD"] as const;

/* ------------------------------- FuelLog --------------------------------- */

const fuelLogSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    plate: { type: String, required: true, trim: true, uppercase: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    km: { type: Number, required: true, min: 0 },
    liters: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCY_ENUM, default: "ARS" },
  },
  { timestamps: true },
);

fuelLogSchema.index({ userId: 1, plate: 1, date: 1 });

export type FuelLogDoc = InferSchemaType<typeof fuelLogSchema>;
export const FuelLog = models.FuelLog ?? model("FuelLog", fuelLogSchema);

/* ---------------------------- UpcomingService ----------------------------- */

const upcomingServiceSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    plate: { type: String, required: true, trim: true, uppercase: true },
    loadedDate: { type: String, required: true }, // YYYY-MM-DD
    nextServiceDate: { type: String, required: true }, // YYYY-MM-DD
    description: { type: String, trim: true, default: "" },
    mechanic: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

upcomingServiceSchema.index({ userId: 1, nextServiceDate: 1 });

export type UpcomingServiceDoc = InferSchemaType<typeof upcomingServiceSchema>;
export const UpcomingService =
  models.UpcomingService ?? model("UpcomingService", upcomingServiceSchema);

/* ----------------------------- ServiceRecord ------------------------------ */

const serviceRecordSchema = new Schema(
  {
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    plate: { type: String, required: true, trim: true, uppercase: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCY_ENUM, default: "ARS" },
    // Nombres libres de los repuestos cambiados en este service.
    parts: { type: [String], default: [] },
  },
  { timestamps: true },
);

serviceRecordSchema.index({ userId: 1, plate: 1, date: 1 });

export type ServiceRecordDoc = InferSchemaType<typeof serviceRecordSchema>;
export const ServiceRecord =
  models.ServiceRecord ?? model("ServiceRecord", serviceRecordSchema);
