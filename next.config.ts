import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Czas builda dla panelu admina (Wersja na produkcji).
  env: { BUILD_TIME: new Date().toISOString() },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
