import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { connectToDatabase } from "./db";
import { Profile, LEGACY_PROFILE_KEY, PROFILE_COOKIE } from "@/models/profile";

export { LEGACY_PROFILE_KEY, PROFILE_COOKIE };

export type ProfileDTO = { id: string; name: string; key: string };

async function readCookieKey(): Promise<string | null> {
  try {
    const value = (await cookies()).get(PROFILE_COOKIE)?.value;
    return value && /^[a-z0-9_-]{1,64}$/i.test(value) ? value : null;
  } catch {
    return null; // fuera de un request (build, etc.)
  }
}

/** Lista de perfiles. Crea el perfil por defecto si todavía no hay ninguno. */
export const listProfiles = cache(async function listProfiles(): Promise<
  ProfileDTO[]
> {
  await connectToDatabase();
  let docs = await Profile.find().sort({ createdAt: 1 }).lean();
  if (docs.length === 0) {
    await Profile.create({ name: "Principal", key: LEGACY_PROFILE_KEY }).catch(
      () => {},
    );
    docs = await Profile.find().sort({ createdAt: 1 }).lean();
  }
  return docs.map((d) => ({
    id: String(d._id),
    name: String(d.name),
    key: String(d.key),
  }));
});

/**
 * Perfil activo: cookie validada contra los perfiles existentes. Si la cookie
 * apunta a un perfil borrado (o no hay cookie), cae al primero.
 */
export const getActiveProfileKey = cache(
  async function getActiveProfileKey(): Promise<string> {
    const [cookieKey, profiles] = await Promise.all([
      readCookieKey(),
      listProfiles(),
    ]);
    if (cookieKey && profiles.some((p) => p.key === cookieKey)) return cookieKey;
    return profiles[0]?.key ?? LEGACY_PROFILE_KEY;
  },
);

export async function getActiveProfile(): Promise<{
  active: ProfileDTO;
  profiles: ProfileDTO[];
}> {
  const [profiles, cookieKey] = await Promise.all([
    listProfiles(),
    readCookieKey(),
  ]);
  const active =
    profiles.find((p) => p.key === cookieKey) ??
    profiles[0] ?? { id: "", name: "Principal", key: LEGACY_PROFILE_KEY };
  return { active, profiles };
}
