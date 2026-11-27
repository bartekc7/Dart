import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminKey, isAdminSession } from "@/lib/server/adminAuth";

/**
 * Panel admina bez klucza wygląda jak zwykła nieistniejąca strona (404).
 * Formularz klucza pokazuje się tylko pod /admin?zaloguj.
 */
export function proxy(req: NextRequest) {
  const key = adminKey();
  if (isAdminSession(req.cookies.get(ADMIN_COOKIE)?.value, key)) return NextResponse.next();
  if (key && req.nextUrl.pathname === "/admin" && req.nextUrl.searchParams.has("zaloguj")) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_brak-strony", req.url), { status: 404 });
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
