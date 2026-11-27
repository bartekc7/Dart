import { fillDays, type DayCount } from "../events";
import { inTransaction, type Db } from "./db";
import { UserError } from "./league";
import type { Pool } from "pg";

/** Dane panelu admina – tylko odczyt. */

export interface AdminLeague {
  id: string;
  name: string;
  createdAt: string;
  players: number;
  games: number;
  lastActive: string | null;
}

export interface AdminMember {
  id: string;
  name: string;
  isOrganizer: boolean;
  active: boolean;
  devices: number;
  lastActive: string | null;
}

export interface AdminEvent {
  id: string;
  at: string;
  type: string;
  leagueId: string | null;
  leagueName: string | null;
  memberId: string | null;
  /** Gracz ligi albo gość 1 na 1. */
  who: string | null;
  guest: boolean;
  device: string | null;
  /** Opis akcji admina, np. nazwa usuniętej ligi. */
  detail: string | null;
}

export interface AdminSummary {
  activeToday: number;
  activeWeek: number;
  eventsToday: number;
  days: DayCount[];
}

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
const TZ = "Europe/Warsaw";

export async function adminLeagues(db: Db): Promise<AdminLeague[]> {
  const { rows } = await db.query(
    `select l.id, l.name, l.created_at,
            (select count(*) from members m where m.league_id = l.id and m.active)::int as players,
            (select count(*) from games g where g.league_id = l.id)::int as games,
            greatest(
              (select max(g.finished_at) from games g where g.league_id = l.id),
              (select max(t.finished_at) from trainings t where t.league_id = l.id),
              (select max(d.last_seen) from devices d join members m on m.id = d.member_id where m.league_id = l.id),
              (select max(e.at) from events e where e.league_id = l.id)) as last_active
       from leagues l
      order by last_active desc nulls last, l.created_at desc`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: iso(r.created_at)!,
    players: r.players,
    games: r.games,
    lastActive: iso(r.last_active),
  }));
}

export async function adminMembers(db: Db, leagueId: string): Promise<AdminMember[]> {
  const { rows } = await db.query(
    `select m.id, m.name, m.is_organizer, m.active,
            (select count(*) from devices d where d.member_id = m.id)::int as devices,
            greatest(
              (select max(d.last_seen) from devices d where d.member_id = m.id),
              (select max(e.at) from events e where e.member_id = m.id),
              (select max(t.finished_at) from trainings t where t.member_id = m.id),
              (select max(g.finished_at) from game_results r join games g on g.id = r.game_id where r.member_id = m.id)) as last_active
       from members m
      where m.league_id = $1
      order by m.active desc, m.is_organizer desc, last_active desc nulls last, lower(m.name)`,
    [leagueId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isOrganizer: r.is_organizer,
    active: r.active,
    devices: r.devices,
    lastActive: iso(r.last_active),
  }));
}

export const ADMIN_EVENTS_LIMIT = 200;

/** Ostatnie wpisy rejestru, opcjonalnie tylko jednej ligi i/lub jednego gracza. */
export async function adminEvents(
  db: Db,
  filter: { leagueId?: string; memberId?: string } = {},
  limit = ADMIN_EVENTS_LIMIT,
): Promise<AdminEvent[]> {
  const { rows } = await db.query(
    `select e.id, e.at, e.type, e.league_id, l.name as league_name, e.member_id, e.device, e.detail,
            coalesce(m.name, p.name) as who, (m.id is null and p.id is not null) as guest
       from events e
       left join leagues l on l.id = e.league_id
       left join members m on m.id = e.member_id
       left join duel_profiles p on p.id = e.profile_id
      where ($1::text is null or e.league_id = $1) and ($2::text is null or e.member_id = $2)
      order by e.at desc, e.id desc
      limit $3`,
    [filter.leagueId ?? null, filter.memberId ?? null, limit],
  );
  return rows.map((r) => ({
    id: String(r.id),
    at: iso(r.at)!,
    type: r.type,
    leagueId: r.league_id ?? null,
    leagueName: r.league_name ?? null,
    memberId: r.member_id ?? null,
    who: r.who ?? null,
    guest: r.guest === true,
    device: r.device ?? null,
    detail: r.detail ?? null,
  }));
}

/** Ile dni pokazujemy na wykresie gier i treningów. */
export const SUMMARY_DAYS = 14;

/**
 * Aktywni dziś i w tym tygodniu (od poniedziałku, czas polski): osoby z wpisem
 * w rejestrze albo z telefonem, który odezwał się do serwera. Gry, treningi
 * i 1 na 1 dziennie liczymy z samych tabel, więc widać też dni sprzed rejestru.
 */
export async function adminSummary(db: Db, now = new Date()): Promise<AdminSummary> {
  const bounds = `with b as (
      select (date_trunc('day', $1::timestamptz at time zone '${TZ}') at time zone '${TZ}') as today,
             (date_trunc('week', $1::timestamptz at time zone '${TZ}') at time zone '${TZ}') as week,
             (date_trunc('day', $1::timestamptz at time zone '${TZ}') at time zone '${TZ}') - make_interval(days => $2::int - 1) as since)`;
  const [active, days] = await Promise.all([
    db.query(
      `${bounds},
       act as (
         select coalesce(member_id, profile_id, device) as who, at from events
         union all select member_id, last_seen from devices
         union all select profile_id, last_seen from duel_devices)
       select count(distinct who) filter (where at >= b.today)::int as today,
              count(distinct who) filter (where at >= b.week)::int as week,
              (select count(*) from events, b where events.at >= b.today)::int as events_today
         from act, b where act.who is not null`,
      [now, SUMMARY_DAYS],
    ),
    db.query(
      `${bounds}
       select to_char(finished_at at time zone '${TZ}', 'YYYY-MM-DD') as day, 'games' as kind, count(*)::int as count
         from games, b where finished_at >= b.since group by 1
       union all
       select to_char(finished_at at time zone '${TZ}', 'YYYY-MM-DD'), 'trainings', count(*)::int
         from trainings, b where finished_at >= b.since group by 1
       union all
       select to_char(coalesce(ended_at, updated_at) at time zone '${TZ}', 'YYYY-MM-DD'), 'duels', count(*)::int
         from duels, b where status = 'finished' and coalesce(ended_at, updated_at) >= b.since group by 1`,
      [now, SUMMARY_DAYS],
    ),
  ]);
  const a = active.rows[0] ?? {};
  return {
    activeToday: a.today ?? 0,
    activeWeek: a.week ?? 0,
    eventsToday: a.events_today ?? 0,
    days: fillDays(days.rows, SUMMARY_DAYS, now),
  };
}

/* ---------- Rozmiar bazy ---------- */

/** Tabele aplikacji w kolejności pokazywania w panelu. */
export const DB_TABLES = [
  { table: "leagues", label: "Ligi" },
  { table: "members", label: "Gracze" },
  { table: "devices", label: "Telefony graczy" },
  { table: "claim_tokens", label: "Linki do przypisania telefonu" },
  { table: "games", label: "Gry ligowe" },
  { table: "game_results", label: "Wyniki gier" },
  { table: "live_games", label: "Gry na żywo" },
  { table: "trainings", label: "Treningi" },
  { table: "duel_profiles", label: "Profile 1 na 1" },
  { table: "duel_devices", label: "Telefony gości 1 na 1" },
  { table: "duels", label: "Gry 1 na 1" },
  { table: "events", label: "Rejestr zdarzeń" },
  { table: "server_errors", label: "Rejestr błędów" },
] as const;

export interface AdminTableSize {
  table: string;
  label: string;
  rows: number;
  /** Dane + indeksy, w bajtach; null gdy baza nie podała. */
  bytes: number | null;
}

export interface AdminDbSize {
  tables: AdminTableSize[];
  totalRows: number;
  /** Suma tabel aplikacji. */
  tablesBytes: number | null;
  /** Cała baza (pg_database_size); null gdy brak uprawnień. */
  databaseBytes: number | null;
  /** Najstarszy wpis rejestru zdarzeń. */
  eventsSince: string | null;
}

export async function adminDbSize(db: Db): Promise<AdminDbSize> {
  // Nazwy tabel są stałe (DB_TABLES), więc można je wstawić do zapytania.
  const sql = DB_TABLES.map(
    ({ table }) =>
      `select '${table}' as t, (select count(*) from ${table})::bigint as n, pg_total_relation_size(to_regclass('${table}'))::bigint as b`,
  ).join(" union all ");
  const [{ rows }, since, dbSize] = await Promise.all([
    db.query(sql),
    db.query("select min(at) as since from events"),
    db.query("select pg_database_size(current_database())::bigint as b").catch(() => ({ rows: [] as { b: string }[] })),
  ]);
  const byTable = new Map(rows.map((r) => [r.t as string, r]));
  const tables = DB_TABLES.map(({ table, label }) => {
    const r = byTable.get(table);
    return { table, label, rows: Number(r?.n ?? 0), bytes: r?.b == null ? null : Number(r.b) };
  });
  const known = tables.filter((t) => t.bytes != null);
  return {
    tables,
    totalRows: tables.reduce((s, t) => s + t.rows, 0),
    tablesBytes: known.length ? known.reduce((s, t) => s + (t.bytes ?? 0), 0) : null,
    databaseBytes: dbSize.rows[0]?.b == null ? null : Number(dbSize.rows[0].b),
    eventsSince: iso(since.rows[0]?.since),
  };
}

/* ---------- Nieaktywne ligi ---------- */

/** Po tylu dniach bez gry (i bez treningu) liga jest nieaktywna. */
export const INACTIVE_DAYS = 30;

export interface InactiveLeague {
  id: string;
  name: string;
  createdAt: string;
  players: number;
  games: number;
  trainings: number;
  /** Ostatnia gra ligowa (albo trening), null gdy nigdy nie grali. */
  lastGame: string | null;
  /** Ostatnie wejście z telefonu gracza – tylko informacyjnie. */
  lastSeen: string | null;
}

/**
 * Warunek „nieaktywna”: założona ponad 30 dni temu i od 30 dni bez skończonej
 * gry, bez trwającej gry i bez treningu. Ten sam warunek sprawdza usuwanie.
 */
const INACTIVE_WHERE = `l.created_at < $1::timestamptz
   and not exists (select 1 from games g where g.league_id = l.id and g.finished_at >= $1::timestamptz)
   and not exists (select 1 from live_games v where v.league_id = l.id and (v.updated_at >= $1::timestamptz or not v.finished))
   and not exists (select 1 from trainings t where t.league_id = l.id and t.finished_at >= $1::timestamptz)`;

function cutoff(now: Date, days = INACTIVE_DAYS): Date {
  return new Date(now.getTime() - days * 86_400_000);
}

export async function adminInactiveLeagues(db: Db, now = new Date(), days = INACTIVE_DAYS): Promise<InactiveLeague[]> {
  const { rows } = await db.query(
    `select l.id, l.name, l.created_at,
            (select count(*) from members m where m.league_id = l.id and m.active)::int as players,
            (select count(*) from games g where g.league_id = l.id)::int as games,
            (select count(*) from trainings t where t.league_id = l.id)::int as trainings,
            greatest((select max(g.finished_at) from games g where g.league_id = l.id),
                     (select max(t.finished_at) from trainings t where t.league_id = l.id)) as last_game,
            (select max(d.last_seen) from devices d join members m on m.id = d.member_id where m.league_id = l.id) as last_seen
       from leagues l
      where ${INACTIVE_WHERE}
      order by last_game asc nulls first, l.created_at asc`,
    [cutoff(now, days)],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: iso(r.created_at)!,
    players: r.players,
    games: r.games,
    trainings: r.trainings,
    lastGame: iso(r.last_game),
    lastSeen: iso(r.last_seen),
  }));
}

export interface DeletedLeague {
  name: string;
  members: number;
  games: number;
  trainings: number;
}

/**
 * Usuwa nieaktywną ligę razem z jej graczami, telefonami, grami i treningami
 * (klucze obce z `on delete cascade`). Wszystko w jednej transakcji: najpierw
 * blokada wiersza ligi, potem ponowne sprawdzenie nazwy i braku aktywności.
 * Inne ligi nie są ruszane. Profile 1 na 1 graczy zostają (bez powiązania z ligą),
 * żeby rywale spoza ligi nie stracili historii.
 */
export async function deleteInactiveLeague(
  pool: Pool,
  leagueId: string,
  typedName: unknown,
  now = new Date(),
  days = INACTIVE_DAYS,
): Promise<DeletedLeague> {
  if (typeof leagueId !== "string" || !leagueId) throw new UserError("Nie wybrano ligi.");
  return inTransaction(pool, async (c) => {
    const found = await c.query("select id, name from leagues where id = $1 for update", [leagueId]);
    const league = found.rows[0];
    if (!league) throw new UserError("Tej ligi już nie ma.", 404);
    if (typeof typedName !== "string" || typedName.trim() !== league.name)
      throw new UserError("Wpisana nazwa nie zgadza się z nazwą ligi.");
    const inactive = await c.query(`select 1 from leagues l where l.id = $2 and ${INACTIVE_WHERE}`, [cutoff(now, days), leagueId]);
    if (inactive.rowCount !== 1) throw new UserError("Ta liga grała w ostatnich 30 dniach – nie można jej usunąć.", 409);
    const counts = await c.query(
      `select (select count(*) from members where league_id = $1)::int as members,
              (select count(*) from games where league_id = $1)::int as games,
              (select count(*) from trainings where league_id = $1)::int as trainings`,
      [leagueId],
    );
    await c.query("delete from events where league_id = $1", [leagueId]);
    const del = await c.query("delete from leagues where id = $1", [leagueId]);
    if (del.rowCount !== 1) throw new Error("Nie udało się usunąć ligi.");
    await c.query("insert into events (type, league_id, detail) values ('admin_league_delete', $1, $2)", [
      leagueId,
      leagueSummary(league.name, counts.rows[0]).slice(0, 200),
    ]);
    return { name: league.name, ...counts.rows[0] };
  });
}

function pl(n: number, one: string, few: string, many: string) {
  const d = n % 10;
  const t = n % 100;
  return `${n} ${n === 1 ? one : d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many}`;
}

/** „Stara (2 graczy, 1 gra, 0 treningów)” – opis do rejestru zdarzeń. */
export function leagueSummary(name: string, c: { members: number; games: number; trainings: number }) {
  return `${name} (${pl(c.members, "gracz", "graczy", "graczy")}, ${pl(c.games, "gra", "gry", "gier")}, ${pl(c.trainings, "trening", "treningi", "treningów")})`;
}
