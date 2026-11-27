import { errorSummary, ERRORS_KEEP_DAYS, ERRORS_KEEP_MAX, routeLabel } from "../errors";
import type { Db } from "./db";

export interface ErrorInput {
  error: unknown;
  /** Ścieżka żądania – zapisujemy ją bez identyfikatorów (routeLabel). */
  path?: string;
  method?: string;
  /** api / strona / akcja itp. */
  source?: string;
}

export interface AdminError {
  id: string;
  at: string;
  kind: string;
  message: string;
  path: string | null;
  method: string | null;
  source: string | null;
}

export interface AdminErrors {
  last24h: number;
  last7d: number;
  recent: AdminError[];
}

/** Zapisuje błąd serwera. Nigdy nie rzuca – rejestr nie może zepsuć odpowiedzi. */
export async function recordError(db: Db, input: ErrorInput): Promise<boolean> {
  try {
    const { kind, message } = errorSummary(input.error);
    const method = input.method && /^[A-Z]{3,7}$/.test(input.method) ? input.method : null;
    await db.query(
      "insert into server_errors (kind, message, path, method, source) values ($1, $2, $3, $4, $5)",
      [kind, message, input.path ? routeLabel(input.path) : null, method, input.source?.slice(0, 20) ?? null],
    );
    return true;
  } catch (e) {
    console.warn("Rejestr błędów: nie udało się zapisać", e);
    return false;
  }
}

/** Kasuje błędy starsze niż 30 dni i ponad limit wpisów. */
export async function pruneErrors(db: Db): Promise<void> {
  try {
    await db.query(
      `delete from server_errors
        where at < now() - make_interval(days => $1::int)
           or id <= (select id from server_errors order by id desc offset $2 limit 1)`,
      [ERRORS_KEEP_DAYS, ERRORS_KEEP_MAX],
    );
  } catch (e) {
    console.warn("Rejestr błędów: nie udało się wyczyścić starych wpisów", e);
  }
}

export const ADMIN_ERRORS_LIMIT = 30;

export async function adminErrors(db: Db, now = new Date(), limit = ADMIN_ERRORS_LIMIT): Promise<AdminErrors> {
  const [counts, rows] = await Promise.all([
    db.query(
      `select count(*) filter (where at >= $1::timestamptz - interval '24 hours')::int as day,
              count(*) filter (where at >= $1::timestamptz - interval '7 days')::int as week
         from server_errors`,
      [now],
    ),
    db.query("select id, at, kind, message, path, method, source from server_errors order by at desc, id desc limit $1", [limit]),
  ]);
  return {
    last24h: counts.rows[0]?.day ?? 0,
    last7d: counts.rows[0]?.week ?? 0,
    recent: rows.rows.map((r) => ({
      id: String(r.id),
      at: new Date(r.at).toISOString(),
      kind: r.kind,
      message: r.message,
      path: r.path ?? null,
      method: r.method ?? null,
      source: r.source ?? null,
    })),
  };
}
