import { redirect } from "next/navigation";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { listProfiles } from "@/lib/profile";
import { resolveClient } from "@/lib/oauth";
import { decideAuthorization } from "./actions";

export const dynamic = "force-dynamic";

type Params = Record<string, string | undefined>;

function ErrorCard({ message }: { message: string }) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
        <ShieldAlert className="h-8 w-8 text-red-600" />
        <h1 className="mt-3 text-lg font-semibold text-slate-900">
          No se puede autorizar esta conexión
        </h1>
        <p className="mt-1 text-sm text-slate-600">{message}</p>
      </div>
    </main>
  );
}

/** Pantalla de consentimiento OAuth para conectar un cliente MCP. */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;
  const session = await auth();
  if (!session?.user) {
    const qs = new URLSearchParams(
      Object.entries(p).filter((e): e is [string, string] => typeof e[1] === "string"),
    );
    redirect(`/login?callbackUrl=${encodeURIComponent(`/oauth/authorize?${qs}`)}`);
  }

  if (p.response_type !== "code") {
    return <ErrorCard message="Solo se admite response_type=code." />;
  }
  if (p.code_challenge_method !== "S256" || !p.code_challenge) {
    return <ErrorCard message="El cliente tiene que usar PKCE (S256)." />;
  }
  const client = await resolveClient(p.client_id ?? "");
  if (!client) return <ErrorCard message="El cliente no está registrado." />;
  if (!p.redirect_uri || !client.redirectUris.includes(p.redirect_uri)) {
    return <ErrorCard message="La dirección de retorno no coincide con la registrada." />;
  }

  const profiles = await listProfiles();
  const host = new URL(p.redirect_uri).host;
  const hidden = {
    client_id: client.clientId,
    redirect_uri: p.redirect_uri,
    state: p.state ?? "",
    code_challenge: p.code_challenge,
    resource: p.resource ?? "",
  };

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <form
        action={decideAuthorization}
        className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <div>
          <ShieldCheck className="h-8 w-8 text-emerald-600" />
          <h1 className="mt-3 text-lg font-semibold text-slate-900">
            {client.clientName} quiere acceder a tu dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Vuelve a <span className="font-medium text-slate-700">{host}</span>{" "}
            después de que decidas.
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium">Va a poder:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-slate-600">
            <li>Leer gastos, ingresos, ahorros, proyección, estadísticas, auto y peso.</li>
            <li>
              Cargar gastos e ingresos, pagar, cobrar y transferir; cargar combustible y
              services; registrar y corregir el peso.
            </li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            No puede borrar datos. Podés revocar el acceso cuando quieras desde
            Personal › Conexiones IA.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Perfil</span>
          <select
            name="profile"
            defaultValue={profiles[0]?.key}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {profiles.map((pr) => (
              <option key={pr.key} value={pr.key}>
                {pr.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            name="decision"
            value="deny"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            name="decision"
            value="approve"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Autorizar
          </button>
        </div>
      </form>
    </main>
  );
}
