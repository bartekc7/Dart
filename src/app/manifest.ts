import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dart – licznik punktów",
    short_name: "Dart",
    description: "Prosty licznik rozgrywek w darta.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1412",
    theme_color: "#0f1412",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
