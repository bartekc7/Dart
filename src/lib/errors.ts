/**
 * Rejestr błędów serwera dla panelu admina. Zapisujemy tylko rodzaj błędu,
 * skrócony komunikat i ścieżkę bez identyfikatorów – bez danych graczy.
 */

/** Ile dni trzymamy błędy i ile najwyżej wpisów. */
export const ERRORS_KEEP_DAYS = 30;
export const ERRORS_KEEP_MAX = 2000;
export const ERROR_MESSAGE_MAX = 200;

/**
 * Ścieżka bez identyfikatorów: /api/duels/Xy7…/accept → /api/duels/:id/accept.
 * Zostają tylko człony ze stałych nazw (małe litery i myślniki), bez parametrów.
 */
export function routeLabel(path: string): string {
  const pathname = path.split(/[?#]/)[0] || "/";
  const parts = pathname
    .split("/")
    .filter(Boolean)
    .slice(0, 8)
    .map((p) => (/^[a-z][a-z-]{0,39}$/.test(p) ? p : ":id"));
  return `/${parts.join("/")}`;
}

/**
 * Krótki opis błędu bez danych: rodzaj, kod Postgresa i pierwsza linia
 * komunikatu, z wyciętą treścią w cudzysłowach i nawiasach (tam Postgres
 * wstawia wartości, np. nazwę gracza przy duplikacie).
 */
export function errorSummary(e: unknown): { kind: string; message: string } {
  const err = e as { name?: unknown; code?: unknown; message?: unknown; digest?: unknown } | null;
  const name = typeof err?.name === "string" && err.name ? err.name : typeof e === "string" ? "Error" : "Nieznany błąd";
  const code = typeof err?.code === "string" && /^[0-9A-Z_]{1,20}$/.test(err.code) ? err.code : null;
  const raw = typeof err?.message === "string" ? err.message : typeof e === "string" ? e : "";
  const firstLine = raw.split("\n")[0];
  const message = firstLine
    .replace(/"[^"]*"/g, '"…"')
    .replace(/'[^']*'/g, "'…'")
    .replace(/\([^)]*\)/g, "(…)")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "…")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ERROR_MESSAGE_MAX);
  const digest = typeof err?.digest === "string" ? err.digest.slice(0, 20) : null;
  return {
    kind: code ? `${name.slice(0, 40)} ${code}` : name.slice(0, 40),
    message: message || (digest ? `digest ${digest}` : "(brak komunikatu)"),
  };
}
