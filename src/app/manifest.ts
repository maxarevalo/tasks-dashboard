import type { MetadataRoute } from "next";

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
  };
}
