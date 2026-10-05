import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { auth } from "@/auth";

/**
 * Contexto de un pedido que no viene del navegador (hoy: el servidor MCP).
 * Lleva el perfil sobre el que se opera, ya validado por el token, para que
 * las mismas queries y acciones de la app funcionen sin cookie ni sesión.
 */
type RequestContext = { source: "mcp"; profileKey: string };

const storage = new AsyncLocalStorage<RequestContext>();

/** Corre `fn` con el contexto dado (todo lo que llame adentro lo ve). */
export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Exige un usuario autenticado: sesión de la app (navegador) o un pedido MCP
 * con token válido (el contexto solo existe si el token ya se verificó).
 */
export async function requireUser(): Promise<void> {
  if (storage.getStore()) return;
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
}
