import { after, NextResponse, type NextRequest } from "next/server";
import { getDb, NoDatabaseError, type Db } from "./db";
import { newDeviceToken, UserError } from "./league";
import { logEvent, type EventInput } from "./events";
import { recordError } from "./errors";

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

/**
 * Wspólna obsługa: połączenie z bazą i zamiana błędów na czytelne odpowiedzi JSON.
 * Nieoczekiwany błąd trafia też do rejestru błędów panelu admina (po odpowiedzi).
 */
export async function handle(fn: (db: Db) => Promise<NextResponse>, req?: NextRequest): Promise<NextResponse> {
  let db: Db | null = null;
  try {
    db = await getDb();
    return await fn(db);
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof NoDatabaseError)
      return NextResponse.json({ error: e.message, code: "no_database" }, { status: 503 });
    console.error(e);
    if (db) {
      const target = db;
      later(() => recordError(target, { error: e, path: req?.nextUrl.pathname, method: req?.method, source: "api" }));
    }
    return NextResponse.json({ error: "Coś poszło nie tak. Spróbuj ponownie." }, { status: 500 });
  }
}

/** Praca po wysłaniu odpowiedzi; poza żądaniem (np. w testach) – od razu. */
function later(run: () => Promise<unknown>) {
  const task = () => run().then(() => undefined);
  try {
    after(task);
  } catch {
    void task();
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

/**
 * Zapis do rejestru zdarzeń po wysłaniu odpowiedzi – nie spowalnia aplikacji
 * i nie psuje jej przy błędzie (logEvent sam łapie błędy).
 */
export function track(db: Db, ev: EventInput) {
  later(() => logEvent(db, ev));
}
