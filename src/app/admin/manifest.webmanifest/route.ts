import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminKey, isAdminSession } from "@/lib/server/adminAuth";

/**
 * Manifest osobnej aplikacji „Dart Admin”. Inne id i scope niż główny Dart (id „/”),
 * więc obie aplikacje mogą być zainstalowane obok siebie. Bez ciasteczka – 404, jak cały panel.
 * Start pod /admin?zaloguj: z ważną sesją pokazuje panel, po wygaśnięciu – formularz klucza.
 */
export async function GET() {
  if (!isAdminSession((await cookies()).get(ADMIN_COOKIE)?.value, adminKey())) {
    return new Response("Not Found", { status: 404 });
  }
  const manifest = {
    id: "/admin",
    name: "Dart Admin",
    short_name: "Dart Admin",
    description: "Panel admina aplikacji Dart.",
    lang: "pl",
    start_url: "/admin?zaloguj",
    scope: "/admin",
    display: "standalone",
    background_color: "#0f1412",
    theme_color: "#1e3a8a",
    icons: [
      { src: "/a/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/a/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/a/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/a/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "private, no-store" },
  });
}
