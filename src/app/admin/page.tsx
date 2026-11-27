import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminLogin, AdminPanel } from "@/components/admin/AdminPanel";
import { ADMIN_COOKIE, adminKey, isAdminSession } from "@/lib/server/adminAuth";

export const metadata: Metadata = { title: "Panel admina – Dart", robots: { index: false, follow: false } };

/** Panel admina (tylko odczyt). Bez klucza – 404 (pilnuje tego też src/proxy.ts). */
export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="wide flex flex-1 flex-col">
      <Suspense fallback={<p className="py-10 text-center text-muted">Wczytuję…</p>}>
        <AdminGate searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s.slice(0, 64) : undefined;
}

async function AdminGate({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const [jar, params] = await Promise.all([cookies(), searchParams]);
  const key = adminKey();
  if (!isAdminSession(jar.get(ADMIN_COOKIE)?.value, key)) {
    if (!key || params.zaloguj === undefined) notFound();
    return <AdminLogin error={params.blad !== undefined} />;
  }
  return <AdminPanel leagueId={one(params.liga)} memberId={one(params.gracz)} />;
}
