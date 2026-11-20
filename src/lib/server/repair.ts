import { randomUUID } from "node:crypto";
import { createGame, applyTurn, standings } from "../game/engine";
import type { GameState, Turn } from "../game/types";
import type { Db } from "./db";

const REMOVED_NAME = "Usunięty gracz";

/**
 * Naprawa po starym „Usuń gracza”, które kasowało gracza razem z jego wynikami
 * (gry dwuosobowe wypadały wtedy z rankingu). Serie gry zostały w `games.turns`,
 * więc odtwarzamy brakujące wyniki i przywracamy gracza jako nieaktywnego.
 * Imię bierzemy z podglądu na żywo, jeśli jeszcze jest; inaczej „Usunięty gracz”.
 * Przy kolejnych uruchomieniach nic nie robi (brak gier z brakującymi wynikami).
 */
export async function restoreRemovedResults(db: Db) {
  const { rows: games } = await db.query(
    `with players as (
       select g.id as game_id, t->>'playerId' as player_id from games g, jsonb_array_elements(g.turns) t
       union
       select g.id, p->>'id' from games g join live_games l on l.id = g.id, jsonb_array_elements(l.state->'players') p)
     select g.id, g.league_id, g.target, g.turns,
            (select l.state->'players' from live_games l where l.id = g.id) as live_players
       from games g
      where exists (
        select 1 from players p
         where p.game_id = g.id
           and not exists (select 1 from game_results r where r.game_id = g.id and r.member_id = p.player_id))`,
  );
  for (const g of games) {
    const turns = g.turns as Turn[];
    // Kolejność rzucania z podglądu na żywo (są tam też gracze, którzy nie zdążyli rzucić), inaczej z serii.
    const live = Array.isArray(g.live_players) ? (g.live_players as { id: string }[]).map((p) => p.id) : [];
    const order = [...new Set([...live, ...turns.map((t) => t.playerId)])];
    const { rows: present } = await db.query("select member_id, place from game_results where game_id = $1", [g.id]);
    const known = new Set(present.map((r) => r.member_id as string));
    const missing = order.filter((id) => !known.has(id));
    if (!missing.length) continue;

    for (const id of missing) await ensureMember(db, g.league_id, id);

    // Miejsca brakujących graczy: wolne numery 1..n, w kolejności z odtworzonej gry.
    const usedPlaces = new Set(present.map((r) => r.place as number));
    const free = Array.from({ length: order.length }, (_, i) => i + 1).filter((p) => !usedPlaces.has(p));
    const ranked = replayOrder(g.target, order, turns).filter((id) => missing.includes(id));
    for (const [i, id] of ranked.entries()) {
      const place = free[i];
      if (place === undefined) break;
      await db.query(
        "insert into game_results (game_id, member_id, place) values ($1, $2, $3) on conflict do nothing",
        [g.id, id, place],
      );
    }
  }
}

/** Kolejność graczy wg odtworzonej gry; gdy serii nie da się odtworzyć, kolejność rzucania. */
function replayOrder(target: number, order: string[], turns: Turn[]): string[] {
  try {
    let state: GameState = createGame(order.map((id) => ({ id, name: id })), target);
    for (const t of turns) state = applyTurn(state, t.scored, t.darts);
    return standings(state).map((s) => s.player.id);
  } catch {
    return order;
  }
}

async function ensureMember(db: Db, leagueId: string, id: string) {
  const { rowCount } = await db.query("select 1 from members where id = $1", [id]);
  if (rowCount) return;
  const { rows } = await db.query(
    `select p->>'name' as name from live_games l, jsonb_array_elements(l.state->'players') p
      where l.league_id = $1 and p->>'id' = $2 limit 1`,
    [leagueId, id],
  );
  const base = (rows[0]?.name as string | undefined) ?? REMOVED_NAME;
  for (let n = 1; n < 100; n++) {
    const name = n === 1 ? base : `${base} ${n}`;
    const { rowCount: taken } = await db.query(
      "select 1 from members where league_id = $1 and lower(name) = lower($2)",
      [leagueId, name],
    );
    if (taken) continue;
    await db.query(
      "insert into members (id, league_id, name, active, created_at) values ($1, $2, $3, false, now()) on conflict (id) do nothing",
      [id, leagueId, name],
    );
    return;
  }
  await db.query("insert into members (id, league_id, name, active) values ($1, $2, $3, false)", [id, leagueId, randomUUID()]);
}
