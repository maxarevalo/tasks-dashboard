"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";

type Ctx = { pending: boolean; push: (href: string) => void };

const NavigationContext = createContext<Ctx | null>(null);

/**
 * Comparte una navegación "con transición": mientras la página nueva carga
 * (ej. al cambiar de mes) `pending` queda en true y el shell muestra la barra
 * de progreso y atenúa el contenido, en lugar de quedar congelado sin aviso.
 */
export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const push = (href: string) => startTransition(() => router.push(href));
  return (
    <NavigationContext.Provider value={{ pending, push }}>
      {children}
    </NavigationContext.Provider>
  );
}

/** `push` con indicador de carga. Fuera del shell cae en `router.push` común. */
export function useNavigate(): Ctx {
  const ctx = useContext(NavigationContext);
  const router = useRouter();
  return ctx ?? { pending: false, push: (href) => router.push(href) };
}

/** Barra fina e indeterminada; se dibuja dentro de un contenedor `relative`. */
export function ProgressBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden transition-opacity ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="nav-progress h-full w-1/3 bg-emerald-500" />
    </div>
  );
}
