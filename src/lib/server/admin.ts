import { fillDays, type DayCount } from "../events";
import type { Db } from "./db";

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
    `select e.id, e.at, e.type, e.league_id, l.name as league_name, e.member_id, e.device,
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
