import type { Metadata } from "next";

/**
 * Panel admina instaluje się jako osobna aplikacja „Dart Admin” (własny manifest i ikona),
 * obok zwykłego Darta. Manifest leży pod /admin, więc bez ciasteczka admina jest 404
 * (src/proxy.ts) – dlatego przeglądarka pobiera go z ciasteczkiem (use-credentials).
 * Ikony są pod neutralną ścieżką /a/, bo nie zdradzają istnienia panelu.
 */
export const metadata: Metadata = {
  manifest: null,
  icons: { icon: "/a/icon.svg", apple: "/a/apple-icon.png" },
  appleWebApp: { capable: true, title: "Dart Admin", statusBarStyle: "black-translucent" },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <link rel="manifest" href="/admin/manifest.webmanifest" crossOrigin="use-credentials" />
      {children}
    </>
  );
}
