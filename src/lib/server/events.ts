import { APP_OPEN_EVERY_MIN, EVENTS_KEEP_DAYS, type EventType } from "../events";
import type { Db } from "./db";
import { hashToken } from "./league";

export interface EventInput {
  type: EventType;
  /** Token urządzenia z ciasteczka – z niego ustalamy gracza (ligę) albo gościa 1 na 1. */
  token?: string;
  /** Gracz, gdy znamy go już wprost (np. właśnie dołączył). */
  memberId?: string;
}

/** Skrócony skrót tokenu: wystarcza, by odróżnić telefony, i nie da się z niego nic odtworzyć. */
export function deviceTag(token: string): string {
  return hashToken(token).slice(0, 10);
}

/**
 * Zapisuje zdarzenie. Nigdy nie rzuca błędem: rejestr nie może przeszkodzić
 * w grze. Wejście do aplikacji z tego samego telefonu liczy się raz na pół godziny.
 */
export async function logEvent(db: Db, ev: EventInput): Promise<boolean> {
  try {
    if (!ev.token && !ev.memberId) return false;
    const hash = ev.token ? hashToken(ev.token) : null;
    const device = hash ? hash.slice(0, 10) : null;
    const { rowCount } = await db.query(
      `insert into events (type, device, member_id, league_id, profile_id)
       select $1::text, $2::text, m.id, m.league_id, p.id
         from (select coalesce($3::text, (select member_id from devices where token_hash = $4::text)) as mid,
                      (select profile_id from duel_devices where token_hash = $4::text) as gid) s
         left join members m on m.id = s.mid
         left join duel_profiles p on p.id = coalesce(s.gid, (select x.id from duel_profiles x where x.member_id = s.mid))
        where not ($5::boolean and exists (
          select 1 from events e where e.type = $1::text and e.device = $2::text
             and e.at > now() - make_interval(mins => $6::int)))`,
      [ev.type, device, ev.memberId ?? null, hash, ev.type === "app_open" && !!device, APP_OPEN_EVERY_MIN],
    );
    return rowCount === 1;
  } catch (e) {
    console.warn("Rejestr zdarzeń: nie udało się zapisać", ev.type, e);
    return false;
  }
}

/** Kasuje wpisy starsze niż 90 dni (też bez rzucania błędem). */
export async function pruneEvents(db: Db): Promise<void> {
  try {
    await db.query("delete from events where at < now() - make_interval(days => $1::int)", [EVENTS_KEEP_DAYS]);
  } catch (e) {
    console.warn("Rejestr zdarzeń: nie udało się wyczyścić starych wpisów", e);
  }
}
