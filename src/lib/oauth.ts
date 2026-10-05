import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getPublicOrigin } from "mcp-handler";
import { connectToDatabase } from "./db";
import { listProfiles } from "./profile";
import { OAuthClient, OAuthToken } from "@/models/oauth";

export const ACCESS_TTL_SECONDS = 60 * 60; // 1 hora
export const REFRESH_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 días
export const CODE_TTL_SECONDS = 10 * 60;
export const MCP_SCOPE = "dashboard";

export const randomToken = () => randomBytes(32).toString("base64url");
export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Origen público de la app (respeta los headers del proxy de Vercel). */
export function issuerFor(req: Request): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? getPublicOrigin(req);
}

/** PKCE S256: base64url(sha256(verifier)) === challenge. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  const computed = createHash("sha256").update(verifier).digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Redirecciones aceptadas: https, o http solo a localhost (clientes de escritorio). */
export function isAllowedRedirect(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === "https:") return true;
    return (
      u.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
    );
  } catch {
    return false;
  }
}

export type ResolvedClient = { clientId: string; clientName: string; redirectUris: string[] };

/**
 * Busca un cliente: registrado por DCR, o un Client ID Metadata Document
 * (client_id = URL https que publica su propio nombre y redirect_uris).
 */
export async function resolveClient(clientId: string): Promise<ResolvedClient | null> {
  if (!clientId) return null;
  if (clientId.startsWith("https://")) {
    try {
      const res = await fetch(clientId, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (!res.ok) return null;
      const doc = (await res.json()) as {
        client_id?: string;
        client_name?: string;
        redirect_uris?: unknown;
      };
      if (doc.client_id !== clientId || !Array.isArray(doc.redirect_uris)) return null;
      const redirectUris = doc.redirect_uris.filter(
        (u): u is string => typeof u === "string" && isAllowedRedirect(u),
      );
      return { clientId, clientName: doc.client_name ?? new URL(clientId).host, redirectUris };
    } catch {
      return null;
    }
  }
  await connectToDatabase();
  const doc = await OAuthClient.findOne({ clientId }).lean();
  if (!doc) return null;
  return {
    clientId,
    clientName: String(doc.clientName || "Cliente MCP"),
    redirectUris: (doc.redirectUris as string[]) ?? [],
  };
}

/** Emite un par acceso/refresco nuevo y devuelve la respuesta del token endpoint. */
export async function issueTokens(opts: {
  clientId: string;
  clientName: string;
  profileKey: string;
  /** Al renovar: se conservan la fecha de autorización y el último uso. */
  grantedAt?: Date;
  lastUsedAt?: Date | null;
}) {
  const access = randomToken();
  const refresh = randomToken();
  const now = Date.now();
  await OAuthToken.create({
    accessHash: sha256(access),
    refreshHash: sha256(refresh),
    clientId: opts.clientId,
    clientName: opts.clientName,
    profileKey: opts.profileKey,
    accessExpiresAt: new Date(now + ACCESS_TTL_SECONDS * 1000),
    refreshExpiresAt: new Date(now + REFRESH_TTL_SECONDS * 1000),
    grantedAt: opts.grantedAt ?? new Date(now),
    lastUsedAt: opts.lastUsedAt ?? null,
  });
  return {
    access_token: access,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refresh,
    scope: MCP_SCOPE,
  };
}

export type VerifiedToken = {
  clientId: string;
  profileKey: string;
  expiresAt?: number;
};

/**
 * Valida un bearer token: el token fijo de MCP_TOKEN (Claude Code / API) o un
 * token de acceso OAuth vigente (claude.ai / Claude Desktop).
 */
export async function verifyBearer(token: string): Promise<VerifiedToken | null> {
  if (!token) return null;
  const fixed = process.env.MCP_TOKEN;
  if (fixed && fixed.length >= 32) {
    const a = Buffer.from(token);
    const b = Buffer.from(fixed);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      const profiles = await listProfiles();
      const wanted = process.env.MCP_PROFILE;
      const key =
        profiles.find((p) => p.key === wanted || p.name === wanted)?.key ??
        profiles[0]?.key;
      return key ? { clientId: "token-fijo", profileKey: key } : null;
    }
  }
  await connectToDatabase();
  const doc = await OAuthToken.findOne({
    accessHash: sha256(token),
    revoked: false,
    accessExpiresAt: { $gt: new Date() },
  }).lean();
  if (!doc) return null;
  await OAuthToken.updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date() } });
  return {
    clientId: String(doc.clientId),
    profileKey: String(doc.profileKey),
    expiresAt: Math.floor(new Date(doc.accessExpiresAt as Date).getTime() / 1000),
  };
}

/** Headers CORS para los endpoints que llaman clientes desde el navegador. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-protocol-version",
};

export function oauthJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
}
