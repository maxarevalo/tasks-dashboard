"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { listProfiles } from "@/lib/profile";
import {
  CODE_TTL_SECONDS,
  randomToken,
  resolveClient,
  sha256,
} from "@/lib/oauth";
import { OAuthCode } from "@/models/oauth";

/**
 * Aprobación o rechazo de un pedido de acceso. Se vuelve a validar todo del
 * lado del servidor: lo que viene del formulario no es confiable.
 */
export async function decideAuthorization(form: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");

  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const state = String(form.get("state") ?? "");
  const codeChallenge = String(form.get("code_challenge") ?? "");
  const resource = String(form.get("resource") ?? "") || null;
  const decision = String(form.get("decision") ?? "");
  const profileKey = String(form.get("profile") ?? "");

  const client = await resolveClient(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    throw new Error("Cliente o redirección inválidos.");
  }

  const target = new URL(redirectUri);
  if (state) target.searchParams.set("state", state);

  if (decision !== "approve") {
    target.searchParams.set("error", "access_denied");
    redirect(target.toString());
  }

  const profiles = await listProfiles();
  if (!profiles.some((p) => p.key === profileKey)) throw new Error("Perfil inválido.");
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)) throw new Error("PKCE inválido.");

  const code = randomToken();
  await connectToDatabase();
  await OAuthCode.create({
    codeHash: sha256(code),
    clientId,
    clientName: client.clientName,
    redirectUri,
    codeChallenge,
    profileKey,
    resource,
    expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000),
  });
  target.searchParams.set("code", code);
  redirect(target.toString());
}
