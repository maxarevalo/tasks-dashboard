import { connectToDatabase } from "@/lib/db";
import {
  CORS_HEADERS,
  issueTokens,
  oauthJson,
  sha256,
  verifyPkce,
} from "@/lib/oauth";
import { OAuthCode, OAuthToken } from "@/models/oauth";

const fail = (error: string, description: string, status = 400) =>
  oauthJson({ error, error_description: description }, status);

async function readParams(req: Request): Promise<URLSearchParams> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return new URLSearchParams(
      Object.entries(body).map(([k, v]) => [k, String(v ?? "")]),
    );
  }
  return new URLSearchParams(await req.text());
}

/** Token endpoint: canjea códigos (con PKCE) y renueva con refresh tokens. */
export async function POST(req: Request) {
  const p = await readParams(req);
  await connectToDatabase();

  if (p.get("grant_type") === "authorization_code") {
    const code = p.get("code") ?? "";
    const verifier = p.get("code_verifier") ?? "";
    // Un solo uso: se borra al canjearlo, aunque después falle la validación.
    const doc = await OAuthCode.findOneAndDelete({ codeHash: sha256(code) }).lean();
    if (!doc || new Date(doc.expiresAt as Date) < new Date()) {
      return fail("invalid_grant", "El código no existe o venció.");
    }
    if (p.get("client_id") && p.get("client_id") !== doc.clientId) {
      return fail("invalid_grant", "El código es de otro cliente.");
    }
    if (p.get("redirect_uri") && p.get("redirect_uri") !== doc.redirectUri) {
      return fail("invalid_grant", "redirect_uri no coincide.");
    }
    if (!verifier || !verifyPkce(verifier, String(doc.codeChallenge))) {
      return fail("invalid_grant", "PKCE inválido.");
    }
    return oauthJson(
      await issueTokens({
        clientId: String(doc.clientId),
        clientName: String(doc.clientName),
        profileKey: String(doc.profileKey),
      }),
    );
  }

  if (p.get("grant_type") === "refresh_token") {
    const refresh = p.get("refresh_token") ?? "";
    // Rotación: el refresh token usado se invalida y se emite un par nuevo.
    const doc = await OAuthToken.findOneAndUpdate(
      {
        refreshHash: sha256(refresh),
        revoked: false,
        refreshExpiresAt: { $gt: new Date() },
      },
      { $set: { revoked: true } },
    ).lean();
    if (!doc) return fail("invalid_grant", "El refresh token no es válido.");
    if (p.get("client_id") && p.get("client_id") !== doc.clientId) {
      return fail("invalid_grant", "El token es de otro cliente.");
    }
    return oauthJson(
      await issueTokens({
        clientId: String(doc.clientId),
        clientName: String(doc.clientName),
        profileKey: String(doc.profileKey),
        grantedAt: (doc.grantedAt as Date | undefined) ?? (doc.createdAt as Date),
        lastUsedAt: (doc.lastUsedAt as Date | null) ?? null,
      }),
    );
  }

  return fail("unsupported_grant_type", "Solo authorization_code y refresh_token.");
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
