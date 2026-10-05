"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { OAuthToken } from "@/models/oauth";

/** Revoca todos los accesos vigentes de un cliente (sus tokens dejan de servir). */
export async function revokeClient(
  clientId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autenticado." };
  await connectToDatabase();
  await OAuthToken.updateMany({ clientId, revoked: false }, { $set: { revoked: true } });
  revalidatePath("/personal/conexiones");
  return { ok: true };
}
