import { headers } from "next/headers";
import { Plug } from "lucide-react";
import { PageHeader } from "@/components/page-parts";
import { connectToDatabase } from "@/lib/db";
import { listProfiles } from "@/lib/profile";
import { OAuthToken } from "@/models/oauth";
import { RevokeButton } from "./revoke-button";
import { CopyField } from "./copy-field";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: process.env.APP_TIMEZONE ?? "America/Argentina/Buenos_Aires",
      }).format(d)
    : "nunca";

export default async function ConexionesPage() {
  await connectToDatabase();
  const [docs, profiles, h] = await Promise.all([
    OAuthToken.find({ revoked: false, refreshExpiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .lean(),
    listProfiles(),
    headers(),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "tu-dominio";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const url = process.env.APP_URL?.replace(/\/$/, "") ?? `${proto}://${host}`;
  const mcpUrl = `${url}/api/mcp`;
  const profileName = new Map(profiles.map((p) => [p.key, p.name]));

  // Un cliente puede tener varios tokens (uno por renovación): se muestra uno por cliente.
  const byClient = new Map<
    string,
    { clientId: string; name: string; profile: string; since: Date; lastUsed: Date | null }
  >();
  for (const d of docs) {
    const k = String(d.clientId);
    const prev = byClient.get(k);
    const lastUsed = (d.lastUsedAt as Date | null) ?? null;
    if (!prev) {
      byClient.set(k, {
        clientId: k,
        name: String(d.clientName || "Cliente MCP"),
        profile: profileName.get(String(d.profileKey)) ?? String(d.profileKey),
        since: ((d.grantedAt as Date | undefined) ?? d.createdAt) as Date,
        lastUsed,
      });
    } else if (lastUsed && (!prev.lastUsed || lastUsed > prev.lastUsed)) {
      prev.lastUsed = lastUsed;
    }
  }
  const clients = [...byClient.values()];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conexiones IA"
        description="Servidor MCP del dashboard: conectá Claude (u otro asistente) para consultar y cargar tus datos."
        icon={Plug}
      />

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Dirección del servidor</h3>
        <CopyField value={mcpUrl} />
        <div className="grid gap-4 text-sm text-slate-600 md:grid-cols-2">
          <div className="space-y-1">
            <p className="font-medium text-slate-800">claude.ai y Claude Desktop</p>
            <p>
              Configuración › Conectores › Agregar conector personalizado, pegá la
              dirección y aceptá. Te va a pedir la contraseña del dashboard y que
              elijas el perfil.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-slate-800">Claude Code o la API</p>
            <p>
              Usan el token fijo de la variable <code className="text-xs">MCP_TOKEN</code>{" "}
              en el header <code className="text-xs">Authorization: Bearer …</code>.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">Accesos autorizados</h3>
        {clients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Todavía no autorizaste ningún cliente por OAuth.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {clients.map((c) => (
              <li key={c.clientId} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    Perfil {c.profile} · desde {fmt(c.since)} · último uso {fmt(c.lastUsed)}
                  </p>
                </div>
                <RevokeButton clientId={c.clientId} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">
          El token fijo (MCP_TOKEN) no aparece acá: para revocarlo, cambialo o
          borralo en las variables de entorno de Vercel.
        </p>
      </section>
    </div>
  );
}
