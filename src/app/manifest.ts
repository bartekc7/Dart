import type { MetadataRoute } from "next";

/** Po „Dodaj do ekranu głównego” Dart otwiera się jak aplikacja: pełny ekran, bez paska przeglądarki. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Dart – licznik punktów",
    short_name: "Dart",
    description: "Prosty licznik rozgrywek w darta dla naszej ligi.",
    lang: "pl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1412",
    theme_color: "#0f1412",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
