import { Pool, type PoolClient } from "pg";
import { restoreRemovedResults } from "./repair";

/**
 * Połączenie z Postgresem (Neon na produkcji, lokalny Postgres w testach).
 * Adres bierzemy z DATABASE_URL, który ustawia integracja Neon w Vercelu.
 */
export type Db = Pick<Pool, "query">;

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
}

export class NoDatabaseError extends Error {
  constructor() {
    super("Baza danych nie jest podłączona (brak DATABASE_URL).");
  }
}

export async function getDb(): Promise<Pool> {
  const url = databaseUrl();
  if (!url) throw new NoDatabaseError();
  if (!pool) pool = new Pool({ connectionString: url, max: 3 });
  schemaReady ??= ensureSchema(pool).catch((e) => {
    schemaReady = null;
    throw e;
  });
  await schemaReady;
  return pool;
}

/** Tabele tworzą się same przy pierwszym zapytaniu – nie trzeba nic uruchamiać ręcznie. */
export const SCHEMA = `
create table if not exists leagues (
  id text primary key,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists members (
  id text primary key,
  league_id text not null references leagues(id) on delete cascade,
  name text not null,
  is_organizer boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists members_league_name on members (league_id, lower(name));
create table if not exists devices (
  token_hash text primary key,
  member_id text not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create table if not exists claim_tokens (
  token text primary key,
  member_id text not null references members(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);
create table if not exists games (
  id text primary key,
  league_id text not null references leagues(id) on delete cascade,
  target integer not null,
  turns jsonb not null,
  created_by text references members(id) on delete set null,
  finished_at timestamptz not null default now()
);
create index if not exists games_league_finished on games (league_id, finished_at desc);
create table if not exists game_results (
  game_id text not null references games(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  place integer not null,
  primary key (game_id, member_id)
);
create table if not exists live_games (
  id text primary key,
  league_id text not null references leagues(id) on delete cascade,
  state jsonb not null,
  scorer_id text references members(id) on delete set null,
  finished boolean not null default false,
  rev bigint not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists live_games_league on live_games (league_id, updated_at desc);
alter table leagues add column if not exists entry_mode text not null default 'sum';
alter table leagues add column if not exists recovery_hash text;
-- Usunięty gracz, który ma rozegrane gry, zostaje nieaktywny: znika z list, a jego wyniki zostają.
alter table members add column if not exists active boolean not null default true;
-- Czas gry: pierwsza rzutka i ostatnia seria (starsze gry: null).
alter table games add column if not exists started_at timestamptz;
alter table games add column if not exists ended_at timestamptz;
-- Treningi solo: osobno od gier ligowych (nie trafiają do rankingu, statystyk ligi ani osiągnięć).
create table if not exists trainings (
  id text primary key,
  league_id text not null references leagues(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  mode text not null,
  variant text not null default '',
  score real not null,
  data jsonb not null,
  started_at timestamptz,
  finished_at timestamptz not null default now()
);
-- Znak gracza: kolor (numer z lib/colors) albo ikonka. Obecni gracze dostają
-- na stałe kolor, który mieli dotąd (wg kolejności dołączenia) – wygląd się nie zmienia.
alter table members add column if not exists color_idx integer;
alter table members add column if not exists icon text;
update members m set color_idx = (select count(*) from members x where x.league_id = m.league_id and (x.created_at, x.id) < (m.created_at, m.id)) % 10
 where m.color_idx is null and m.icon is null;
create unique index if not exists members_league_icon on members (league_id, icon) where icon is not null;
create index if not exists trainings_member on trainings (member_id, finished_at desc);
`;

export async function ensureSchema(db: Db) {
  await db.query(SCHEMA);
  await restoreRemovedResults(db);
}

export async function inTransaction<T>(db: Pool, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await db.connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
