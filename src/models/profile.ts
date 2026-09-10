import { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Perfil = ambiente de datos dentro de la misma base. Cada documento del resto
 * de las colecciones guarda `userId` = `Profile.key`, así se separan datos
 * reales / ficticios / etc. sin cambiar de conexión.
 */
const profileSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

export type ProfileDoc = InferSchemaType<typeof profileSchema>;
export const Profile = models.Profile ?? model("Profile", profileSchema);

/** Perfil por defecto: coincide con el userId de los datos previos a esta feature. */
export const LEGACY_PROFILE_KEY = "owner";
export const PROFILE_COOKIE = "profile";
