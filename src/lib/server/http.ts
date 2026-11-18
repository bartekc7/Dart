import { NextResponse, type NextRequest } from "next/server";
import { getDb, NoDatabaseError, type Db } from "./db";
import { newDeviceToken, UserError } from "./league";

/** Identyfikator urządzenia: losowy sekret w ciasteczku (w bazie trzymamy tylko jego skrót). */
export const DEVICE_COOKIE = "dart_device";
const TWO_YEARS = 60 * 60 * 24 * 365 * 2;

export function deviceToken(req: NextRequest): string | undefined {
  return req.cookies.get(DEVICE_COOKIE)?.value || undefined;
}

/** Zwraca token urządzenia; jeśli go nie ma, tworzy nowy (zapisze go `withDeviceCookie`). */
export function ensureDeviceToken(req: NextRequest): { token: string; isNew: boolean } {
  const existing = deviceToken(req);
  return existing ? { token: existing, isNew: false } : { token: newDeviceToken(), isNew: true };
}

export function withDeviceCookie(res: NextResponse, token: string) {
  res.cookies.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TWO_YEARS,
  });
  return res;
}

/** Wspólna obsługa: połączenie z bazą i zamiana błędów na czytelne odpowiedzi JSON. */
export async function handle(fn: (db: Db) => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn(await getDb());
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof NoDatabaseError)
      return NextResponse.json({ error: e.message, code: "no_database" }, { status: 503 });
    console.error(e);
    return NextResponse.json({ error: "Coś poszło nie tak. Spróbuj ponownie." }, { status: 500 });
  }
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}
