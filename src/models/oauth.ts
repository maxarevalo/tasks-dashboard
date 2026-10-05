import { Schema, model, models, type InferSchemaType } from "mongoose";

/*
 * Servidor de autorización OAuth 2.1 mínimo para el endpoint MCP (claude.ai,
 * Claude Desktop y otros clientes). Los códigos y tokens se guardan solo como
 * hash SHA-256: si alguien lee la base, no puede usarlos.
 */

/** Cliente registrado por Dynamic Client Registration (RFC 7591). */
const oauthClientSchema = new Schema(
  {
    clientId: { type: String, required: true, unique: true },
    clientName: { type: String, default: "" },
    redirectUris: { type: [String], default: [] },
  },
  { timestamps: true },
);
export type OAuthClientDoc = InferSchemaType<typeof oauthClientSchema>;
export const OAuthClient =
  models.OAuthClient ?? model("OAuthClient", oauthClientSchema);

/** Código de autorización: un solo uso, vence a los 10 minutos. */
const oauthCodeSchema = new Schema(
  {
    codeHash: { type: String, required: true, unique: true },
    clientId: { type: String, required: true },
    clientName: { type: String, default: "" },
    redirectUri: { type: String, required: true },
    codeChallenge: { type: String, required: true },
    profileKey: { type: String, required: true },
    resource: { type: String, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
oauthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const OAuthCode = models.OAuthCode ?? model("OAuthCode", oauthCodeSchema);

/** Acceso concedido a un cliente: token de acceso + token de refresco. */
const oauthTokenSchema = new Schema(
  {
    accessHash: { type: String, required: true, unique: true },
    refreshHash: { type: String, required: true, unique: true },
    clientId: { type: String, required: true },
    clientName: { type: String, default: "" },
    profileKey: { type: String, required: true },
    accessExpiresAt: { type: Date, required: true },
    refreshExpiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: null },
    /** Cuándo aprobaste el acceso; se conserva al renovar los tokens. */
    grantedAt: { type: Date, default: () => new Date() },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);
oauthTokenSchema.index({ refreshExpiresAt: 1 }, { expireAfterSeconds: 0 });
export type OAuthTokenDoc = InferSchemaType<typeof oauthTokenSchema>;
export const OAuthToken =
  models.OAuthToken ?? model("OAuthToken", oauthTokenSchema);
