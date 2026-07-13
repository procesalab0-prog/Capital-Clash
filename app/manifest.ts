import type { MetadataRoute } from "next";

/**
 * Manifest de la PWA: al "Agregar a inicio" en el móvil, la app se instala
 * con el logo de Capital Clash, su nombre y en modo pantalla completa.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Capital Clash",
    short_name: "Capital Clash",
    description:
      "El juego de estrategia financiera para invertir en equipo: forma un fondo con tus amigos, vota cada inversión y compite por el mejor rendimiento.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F1E4",
    theme_color: "#F5F1E4",
    lang: "es",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
