import { CORS_HEADERS, MCP_SCOPE, issuerFor, oauthJson } from "@/lib/oauth";

/**
 * Metadata del recurso protegido (RFC 9728) para el endpoint MCP. Responde
 * tanto en /.well-known/oauth-protected-resource como con el path del recurso
 * agregado (/.well-known/oauth-protected-resource/api/mcp).
 */
export function GET(req: Request) {
  const origin = issuerFor(req);
  return oauthJson({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Mi Dashboard",
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
