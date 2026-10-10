import { Schema, model, models, type InferSchemaType } from "mongoose";
import { OWNER_ID } from "./gastos";

export { OWNER_ID };

/* --------------------------- PushSubscription ---------------------------- */

/** Un dispositivo (navegador o app instalada) que aceptó recibir notificaciones. */
const pushSubscriptionSchema = new Schema(
  {
    /** Perfil para el que se activó: recibe los avisos de ese perfil. */
    userId: { type: String, required: true, default: OWNER_ID, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    /** Para reconocer el dispositivo en la lista ("Android · Chrome"). */
    device: { type: String, default: "" },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type PushSubscriptionDoc = InferSchemaType<typeof pushSubscriptionSchema>;
export const PushSubscriptionModel =
  models.PushSubscription ?? model("PushSubscription", pushSubscriptionSchema);

/* ------------------------- NotificationSettings -------------------------- */

const notificationSettingsSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    /** Avisar desde esta cantidad de días antes del vencimiento (y cada día hasta el día). */
    daysBefore: { type: Number, default: 2, min: 0, max: 30 },
  },
  { timestamps: true },
);

export const NotificationSettings =
  models.NotificationSettings ??
  model("NotificationSettings", notificationSettingsSchema);

/* --------------------------- NotificationLog ----------------------------- */

/** Evita mandar dos veces el mismo aviso el mismo día (si el cron corre de nuevo). */
const notificationLogSchema = new Schema(
  {
    userId: { type: String, required: true },
    /** "<clave del vencimiento>:<YYYY-MM-DD del envío>" */
    key: { type: String, required: true },
  },
  { timestamps: true },
);

notificationLogSchema.index({ userId: 1, key: 1 }, { unique: true });
// Se borran solos a los 60 días.
notificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 86400 });

export const NotificationLog =
  models.NotificationLog ?? model("NotificationLog", notificationLogSchema);
