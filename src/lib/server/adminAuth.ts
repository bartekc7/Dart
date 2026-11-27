import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Dostęp do panelu admina: tajny klucz w zmiennej ADMIN_KEY (Vercel).
 * W ciasteczku nie trzymamy samego klucza, tylko podpis z niego – zmiana
 * klucza w Vercelu od razu wylogowuje wszystkie przeglądarki.
 */
export const ADMIN_COOKIE = "dart_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
/** Za krótki klucz łatwo zgadnąć – wtedy panel jest wyłączony. */
export const ADMIN_KEY_MIN = 12;

export function adminKey(env: Record<string, string | undefined> = process.env): string | null {
  const key = env.ADMIN_KEY?.trim();
  return key && key.length >= ADMIN_KEY_MIN ? key : null;
}

function sha(v: string): Buffer {
  return createHash("sha256").update(v).digest();
}

/** Porównanie bez zdradzania czasem, ile znaków się zgadza. */
function same(a: string, b: string): boolean {
  return timingSafeEqual(sha(a), sha(b));
}

export function sessionValue(key: string): string {
  return createHmac("sha256", key).update("dart-admin-v1").digest("base64url");
}

/** Czy wpisany klucz jest poprawny. */
export function checkKey(input: unknown, key: string | null): boolean {
  if (!key || typeof input !== "string") return false;
  return same(input.trim(), key);
}

/** Czy ciasteczko otwiera panel. */
export function isAdminSession(cookie: string | undefined, key: string | null): boolean {
  if (!key || !cookie) return false;
  return same(cookie, sessionValue(key));
}

/**
 * Jednorazowy w obrębie sesji token do akcji zapisującej (ochrona przed CSRF
 * oprócz ciasteczka SameSite=Strict i sprawdzania Origin przez Next.js).
 * Wiąże akcję z konkretnym obiektem, np. „usuń ligę X”.
 */
export function actionToken(key: string, action: string, target: string): string {
  return createHmac("sha256", key).update(`dart-admin-action-v1\n${action}\n${target}`).digest("base64url");
}

export function checkActionToken(input: unknown, key: string | null, action: string, target: string): boolean {
  if (!key || typeof input !== "string" || !input) return false;
  return same(input, actionToken(key, action, target));
}
