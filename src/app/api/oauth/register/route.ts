import { randomUUID } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { CORS_HEADERS, isAllowedRedirect, oauthJson } from "@/lib/oauth";
import { OAuthClient } from "@/models/oauth";

/**
 * Dynamic Client Registration (RFC 7591). Registrarse no da acceso a nada:
 * el acceso se concede recién cuando vos aprobás en /oauth/authorize.
 */
export async function POST(req: Request) {
  let body: { client_name?: unknown; redirect_uris?: unknown };
  try {
    body = await req.json();
  } catch {
    return oauthJson({ error: "invalid_client_metadata", error_description: "JSON inválido." }, 400);
  }
  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  if (redirectUris.length === 0 || redirectUris.length > 10 || !redirectUris.every(isAllowedRedirect)) {
    return oauthJson(
      { error: "invalid_redirect_uri", error_description: "redirect_uris debe ser https (o http a localhost)." },
      400,
    );
  }
  const clientName =
    typeof body.client_name === "string" ? body.client_name.slice(0, 100) : "Cliente MCP";

  await connectToDatabase();
  const clientId = randomUUID();
  await OAuthClient.create({ clientId, clientName, redirectUris });

  return oauthJson(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    201,
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
