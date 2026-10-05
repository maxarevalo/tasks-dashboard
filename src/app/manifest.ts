import type { MetadataRoute } from "next";
import { SHORTCUTS } from "@/lib/shortcuts";

/** Manifest de la PWA: permite instalar el dashboard en el celular como una app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mi Dashboard",
    short_name: "Dashboard",
    description: "Panel personal y laboral",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Accesos directos: aparecen al mantener apretado el ícono de la app
    // instalada (Android y escritorio). Cada uno abre el diálogo correspondiente.
    shortcuts: SHORTCUTS.map((sc) => ({
      name: sc.name,
      short_name: sc.short,
      url: sc.href,
      icons: [{ src: sc.icon, sizes: "96x96", type: "image/png" }],
    })),
  };
}
