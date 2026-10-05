import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyBearer, MCP_SCOPE } from "@/lib/oauth";
import { registerDashboardTools } from "@/features/mcp/tools";

/**
 * Servidor MCP del dashboard (Streamable HTTP). Acepta el token fijo de
 * MCP_TOKEN (Claude Code / API) o un token OAuth emitido por /api/oauth/token
 * (claude.ai / Claude Desktop). El perfil sale del token.
 */
const handler = createMcpHandler(registerDashboardTools, {
  serverInfo: { name: "mi-dashboard", version: "1.0.0" },
  instructions:
    "Dashboard personal de finanzas (gastos, ingresos, ahorros, proyección, estadísticas, plazos fijos, auto) y salud (peso). Montos en ARS o USD; meses en formato YYYY-MM. Llamá a `contexto` para saber la fecha de hoy y las etiquetas. Antes de pagar, cobrar, transferir o cerrar el mes, mostrale al usuario qué vas a hacer (montos y cuentas) y pedí confirmación.",
});

const authed = withMcpAuth(
  handler,
  async (_req, bearer) => {
    const v = await verifyBearer(bearer ?? "");
    if (!v) return undefined;
    return {
      token: bearer!,
      clientId: v.clientId,
      scopes: [MCP_SCOPE],
      expiresAt: v.expiresAt,
      extra: { profileKey: v.profileKey },
    };
  },
  { required: true },
);

export { authed as GET, authed as POST, authed as DELETE };
