"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Los accesos directos abren un diálogo con `?accion=...`. Una vez abierto, se
 * saca el parámetro de la URL para que recargar la página no lo vuelva a abrir.
 */
export function useClearActionParam(action: string | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (!action) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("accion");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [action, router]);
}
