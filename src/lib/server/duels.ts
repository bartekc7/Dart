import { randomUUID } from "node:crypto";
import { applyTurn, createGame, currentPlayer, finishOrder, isGameOver, isValidDart, undoLastTurn } from "../game/engine";
import type { GameState, Turn } from "../game/types";
import { parseLook } from "../looks";
import {
  distinctLooks,
  INVITE_TTL_MS,
  isDuelTarget,
  playOrder,
  rematchStarter,
  type Duel,
  type DuelLive,
  type DuelProfile,
  type DuelStatus,
} from "../duel";
import { duelForm, duelRecords, duelTotals, headToHead, type DuelTotals, type FinishedDuel, type HeadToHead } from "../duelStats";
import type { PlayerForm } from "../game/form";
import type { RecordsState } from "../game/records";
import type { Db } from "./db";
import { cleanName, hashToken, listMembers, newJoinCode, UserError, whoAmI, type Member } from "./league";

/*
 * Gry 1 na 1: towarzyskie, poza ligą, z osobnymi statystykami.
 * - Gracz to profil 1 na 1 (nazwa + znak). Gracz z ligi dostaje go sam
 *   (ta sama nazwa i znak co w lidze), osoba spoza ligi podaje je raz.
 * - Jeden zaprasza, drugi musi przyjąć. Zaproszenie ważne 10 minut.
 * - Serwer trzyma jeden stan gry. Serię zapisuje tylko gracz, który ma kolej,
 *   ze swojego telefonu – dzięki temu nie ma rozbieżności.
 * - Gry 1 na 1 widzą tylko ich dwaj gracze.
 */

const INVITE_TTL = `${INVITE_TTL_MS / 60000} minutes`;
const STALE = "12 hours";
/** Ile po zakończeniu można jeszcze cofnąć ostatnią serię (pomyłka przy wpisywaniu). */
const UNDO_FINISHED = "5 minutes";

function toProfile(r: { id: string; name: string; color_idx: number | null; icon: string | null }): DuelProfile {
  return { id: r.id, name: r.name, color: r.icon ? -1 : (r.color_idx ?? 0), icon: r.icon ?? null };
}

/**
 * Profil gracza ligi; powstaje przy pierwszym użyciu i zawsze ma nazwę i znak
 * z ligi. Gdy na tym telefonie był wcześniej profil gościa (grał 1 na 1, zanim
 * dołączył do ligi), staje się on profilem tego gracza – bilans zostaje.
 */
export async function profileForMember(db: Db, m: Pick<Member, "id" | "name" | "color" | "icon">, token?: string): Promise<DuelProfile> {
  const color = m.icon ? null : m.color;
  let { rows } = await db.query("select * from duel_profiles where member_id = $1", [m.id]);
  if (!rows[0] && token) {
    ({ rows } = await db.query(
      `update duel_profiles p set member_id = $1 from duel_devices d
        where d.token_hash = $2 and d.profile_id = p.id and p.member_id is null returning p.*`,
      [m.id, hashToken(token)],
    ));
  }
  if (!rows[0]) {
    ({ rows } = await db.query(
      `insert into duel_profiles (id, member_id, name, color_idx, icon) values ($1, $2, $3, $4, $5)
       on conflict (member_id) do update set name = excluded.name returning *`,
      [randomUUID(), m.id, m.name, color, m.icon],
    ));
  }
  const p = rows[0];
  if (p.name !== m.name || (p.icon ?? null) !== m.icon || (p.color_idx ?? null) !== color) {
    await db.query("update duel_profiles set name = $2, color_idx = $3, icon = $4 where id = $1", [p.id, m.name, color, m.icon]);
  }
  return toProfile({ id: p.id, name: m.name, color_idx: color, icon: m.icon });
}

/** Kim jest ten telefon w grach 1 na 1 (null = jeszcze nikim). */
export async function myProfile(db: Db, token: string | undefined): Promise<DuelProfile | null> {
  if (!token) return null;
  const me = await whoAmI(db, token);
  if (me) return profileForMember(db, me.member, token);
  const { rows } = await db.query(
    "select p.* from duel_devices d join duel_profiles p on p.id = d.profile_id where d.token_hash = $1",
    [hashToken(token)],
  );
  if (!rows[0]) return null;
  await db.query("update duel_devices set last_seen = now() where token_hash = $1", [hashToken(token)]);
  return toProfile(rows[0]);
}

export async function requireProfile(db: Db, token: string | undefined): Promise<DuelProfile> {
  const p = await myProfile(db, token);
  if (!p) throw new UserError("Najpierw podaj swoją nazwę.", 401);
  return p;
}

/** Osoba spoza ligi: nazwa i znak, raz na zawsze (przypięte do tego telefonu). */
export async function createGuestProfile(db: Db, token: string, rawName: unknown, rawLook?: unknown): Promise<DuelProfile> {
  const existing = await myProfile(db, token);
  if (existing) return existing;
  const name = cleanName(rawName);
  const look = rawLook === undefined || rawLook === null || rawLook === "" ? { color: 0, icon: null } : parseLook(rawLook);
  if (!look) throw new UserError("Nieznany kolor albo ikonka.");
  const id = randomUUID();
  await db.query("insert into duel_profiles (id, name, color_idx, icon) values ($1, $2, $3, $4)", [id, name, look.color, look.icon]);
  await db.query(
    `insert into duel_devices (token_hash, profile_id) values ($1, $2)
     on conflict (token_hash) do update set profile_id = excluded.profile_id, last_seen = now()`,
    [hashToken(token), id],
  );
  return toProfile({ id, name, color_idx: look.color, icon: look.icon });
}

/** Zaproszenia po czasie wygasają, a porzucone gry same się anulują. */
async function housekeeping(db: Db) {
  await db.query(
    `update duels set status = 'expired', updated_at = now()
      where status = 'pending' and created_at < now() - interval '${INVITE_TTL}'`,
  );
  await db.query(
    `update duels set status = 'cancelled', updated_at = now()
      where status = 'active' and updated_at < now() - interval '${STALE}'`,
  );
}

const DUEL_SELECT = `
  select d.*, pi.name as i_name, pi.color_idx as i_color, pi.icon as i_icon,
         pr.name as r_name, pr.color_idx as r_color, pr.icon as r_icon,
         (select x.id from duels x where x.rematch_of = d.id and x.status in ('pending', 'active', 'finished')
           order by x.created_at desc limit 1) as rematch_id
    from duels d join duel_profiles pi on pi.id = d.inviter_id left join duel_profiles pr on pr.id = d.rival_id`;

type Row = Record<string, unknown>;

async function balanceOf(db: Db, a: string, b: string): Promise<Record<string, number>> {
  const { rows } = await db.query(
    `select winner_id, count(*)::int as n from duels
      where status = 'finished' and ((inviter_id = $1 and rival_id = $2) or (inviter_id = $2 and rival_id = $1))
      group by winner_id`,
    [a, b],
  );
  const out: Record<string, number> = { [a]: 0, [b]: 0 };
  for (const r of rows) if (r.winner_id in out) out[r.winner_id] = r.n;
  return out;
}

async function toDuel(db: Db, r: Row, meId: string): Promise<Duel> {
  let inviter = toProfile({ id: r.inviter_id as string, name: r.i_name as string, color_idx: r.i_color as number | null, icon: r.i_icon as string | null });
  let rival = r.rival_id
    ? toProfile({ id: r.rival_id as string, name: r.r_name as string, color_idx: r.r_color as number | null, icon: r.r_icon as string | null })
    : null;
  if (rival) [inviter, rival] = distinctLooks(inviter, rival);
  const starterId = r.starter === "rival" ? (rival?.id ?? null) : inviter.id;
  return {
    id: r.id as string,
    status: r.status as DuelStatus,
    target: r.target as number,
    inviter,
    rival,
    starterId,
    inviteCode: r.inviter_id === meId ? ((r.invite_code as string) ?? null) : null,
    state: (r.state as GameState) ?? null,
    live: (r.live as DuelLive) ?? null,
    rev: Number(r.rev),
    winnerId: (r.winner_id as string) ?? null,
    createdAt: new Date(r.created_at as string).toISOString(),
    expiresAt: new Date(r.created_at as string).getTime() + INVITE_TTL_MS,
    balance: rival ? await balanceOf(db, inviter.id, rival.id) : {},
    rematchId: (r.rematch_id as string) ?? null,
  };
}

async function rowOf(db: Db, id: string): Promise<Row | null> {
  const { rows } = await db.query(`${DUEL_SELECT} where d.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Wiersz gry, w której gram (inaczej 404 – cudzych gier nie pokazujemy). */
async function myRow(db: Db, me: DuelProfile, id: string): Promise<Row> {
  const r = typeof id === "string" && id.length <= 64 ? await rowOf(db, id) : null;
  if (!r || (r.inviter_id !== me.id && r.rival_id !== me.id)) throw new UserError("Nie ma takiej gry.", 404);
  return r;
}

export async function getDuel(db: Db, me: DuelProfile, id: string): Promise<Duel> {
  await housekeeping(db);
  return toDuel(db, await myRow(db, me, id), me.id);
}

/** Moja trwająca gra (najwyżej jedna). */
async function activeOf(db: Db, profileId: string): Promise<Row | null> {
  const { rows } = await db.query(
    `${DUEL_SELECT} where d.status = 'active' and (d.inviter_id = $1 or d.rival_id = $1) order by d.updated_at desc limit 1`,
    [profileId],
  );
  return rows[0] ?? null;
}

export interface DuelsMe {
  profile: DuelProfile | null;
  /** Zaproszenie do mnie, które czeka na odpowiedź. */
  incoming: Duel | null;
  /** Moja trwająca gra. */
  active: Duel | null;
  /** Moje zaproszenie, które czeka na rywala. */
  outgoing: { id: string } | null;
}

/** Stan dla telefonu: zaproszenie do mnie, moja gra, moje zaproszenie. Telefon pyta co kilka sekund. */
export async function duelsMe(db: Db, token: string | undefined): Promise<DuelsMe> {
  const profile = await myProfile(db, token);
  if (!profile) return { profile: null, incoming: null, active: null, outgoing: null };
  await housekeeping(db);
  const [inc, act, out] = await Promise.all([
    db.query(`${DUEL_SELECT} where d.status = 'pending' and d.rival_id = $1 order by d.created_at desc limit 1`, [profile.id]),
    activeOf(db, profile.id),
    db.query("select id from duels where status = 'pending' and inviter_id = $1 order by created_at desc limit 1", [profile.id]),
  ]);
  return {
    profile,
    incoming: inc.rows[0] ? await toDuel(db, inc.rows[0], profile.id) : null,
    active: act ? await toDuel(db, act, profile.id) : null,
    outgoing: out.rows[0] ? { id: out.rows[0].id } : null,
  };
}

export interface Opponent extends DuelProfile {
  /** Gracz z mojej ligi. */
  inLeague: boolean;
  won: number;
  lost: number;
  /** Ostatnia wspólna gra (ISO) albo null. */
  lastPlayed: string | null;
  /** Czy wygrałem ostatnią wspólną grę (null = jeszcze nie graliśmy). */
  lastWon: boolean | null;
}

/** Kogo mogę zaprosić: gracze mojej ligi i wszyscy, z kim już grałem 1 na 1. */
export async function opponents(db: Db, token: string | undefined): Promise<Opponent[]> {
  const me = await requireProfile(db, token);
  const out = new Map<string, Opponent>();
  const league = await whoAmI(db, token);
  if (league) {
    for (const m of await listMembers(db, league.league.id)) {
      if (m.id === league.member.id) continue;
      const p = await profileForMember(db, m);
      out.set(p.id, { ...p, inLeague: true, won: 0, lost: 0, lastPlayed: null, lastWon: null });
    }
  }
  const { rows } = await db.query(
    `select o.id, o.name, o.color_idx, o.icon, t.won, t.lost, t.last, t.last_won
       from (select case when inviter_id = $1 then rival_id else inviter_id end as other,
                    count(*) filter (where winner_id = $1)::int as won,
                    count(*) filter (where winner_id <> $1)::int as lost,
                    max(coalesce(ended_at, updated_at)) as last,
                    (array_agg(winner_id = $1 order by coalesce(ended_at, updated_at) desc))[1] as last_won
               from duels where status = 'finished' and (inviter_id = $1 or rival_id = $1) group by 1) t
       join duel_profiles o on o.id = t.other`,
    [me.id],
  );
  for (const r of rows) {
    const prev = out.get(r.id);
    out.set(r.id, {
      ...(prev ?? { ...toProfile(r), inLeague: false }),
      won: r.won,
      lost: r.lost,
      lastPlayed: new Date(r.last).toISOString(),
      lastWon: r.last_won,
    });
  }
  return [...out.values()].sort(
    (a, b) => (b.lastPlayed ?? "").localeCompare(a.lastPlayed ?? "") || a.name.localeCompare(b.name, "pl"),
  );
}

/** Przed nowym zaproszeniem albo przyjęciem: nie mogę mieć trwającej gry, a moje stare zaproszenia znikają. */
async function getReady(db: Db, me: DuelProfile) {
  if (await activeOf(db, me.id)) throw new UserError("Najpierw dokończ albo anuluj trwający pojedynek.", 409);
  await db.query("update duels set status = 'cancelled', updated_at = now() where status = 'pending' and inviter_id = $1", [me.id]);
}

async function insertInvite(
  db: Db,
  me: DuelProfile,
  rivalId: string | null,
  target: number,
  starter: "inviter" | "rival",
  rematchOf: string | null = null,
): Promise<string> {
  const id = randomUUID();
  for (let attempt = 0; ; attempt++) {
    try {
      await db.query(
        `insert into duels (id, inviter_id, rival_id, target, starter, status, invite_code, rematch_of)
         values ($1, $2, $3, $4, $5, 'pending', $6, $7)`,
        [id, me.id, rivalId, target, starter, rivalId ? null : newJoinCode(8), rematchOf],
      );
      return id;
    } catch (e) {
      if ((e as { code?: string }).code !== "23505" || attempt > 3) throw e;
    }
  }
}

async function requireFreeRival(db: Db, rivalId: string): Promise<DuelProfile> {
  const { rows } = await db.query("select * from duel_profiles where id = $1", [rivalId]);
  if (!rows[0]) throw new UserError("Nie ma takiego gracza.", 404);
  const rival = toProfile(rows[0]);
  if (await activeOf(db, rival.id)) throw new UserError(`${rival.name} właśnie gra inny pojedynek 1 na 1.`, 409);
  return rival;
}

/**
 * Nowe zaproszenie. Z `rivalId` trafia prosto do aplikacji rywala,
 * bez niego powstaje link (QR) dla nowej osoby.
 */
export async function createDuel(
  db: Db,
  token: string | undefined,
  input: { target?: unknown; starter?: unknown; rivalId?: unknown },
): Promise<{ id: string }> {
  const me = await requireProfile(db, token);
  const target = Number(input.target);
  if (!isDuelTarget(target)) throw new UserError("Wybierz, do ilu gracie.");
  const pick = input.starter;
  if (pick !== "me" && pick !== "rival" && pick !== "random") throw new UserError("Wybierz, kto zaczyna.");
  const starter = pick === "me" ? "inviter" : pick === "rival" ? "rival" : Math.random() < 0.5 ? "inviter" : "rival";
  let rivalId: string | null = null;
  if (input.rivalId !== undefined && input.rivalId !== null) {
    if (typeof input.rivalId !== "string" || input.rivalId === me.id) throw new UserError("Nie ma takiego gracza.", 404);
    rivalId = input.rivalId;
  }
  await housekeeping(db);
  await getReady(db, me);
  if (rivalId) await requireFreeRival(db, rivalId);
  return { id: await insertInvite(db, me, rivalId, target, starter) };
}

/** Rozpoczyna przyjętą grę: zaczynający rzuca pierwszy. */
async function start(db: Db, r: Row, rivalId: string) {
  const { rows } = await db.query("select * from duel_profiles where id = any($1)", [[r.inviter_id, rivalId]]);
  const byId = new Map(rows.map((p) => [p.id as string, { id: p.id as string, name: p.name as string }]));
  const inviter = byId.get(r.inviter_id as string)!;
  const rival = byId.get(rivalId)!;
  const starterId = r.starter === "rival" ? rival.id : inviter.id;
  const state: GameState = { ...createGame(playOrder(inviter, rival, starterId), r.target as number), id: r.id as string };
  const { rowCount } = await db.query(
    `update duels set status = 'active', rival_id = $2, state = $3, live = null, rev = rev + 1, invite_code = null,
            started_at = now(), updated_at = now()
      where id = $1 and status = 'pending'`,
    [r.id, rivalId, JSON.stringify(state)],
  );
  if (!rowCount) throw new UserError("To zaproszenie jest już nieaktualne.", 409);
}

function requirePending(r: Row) {
  if (r.status !== "pending" || new Date(r.created_at as string).getTime() + INVITE_TTL_MS < Date.now())
    throw new UserError("To zaproszenie jest już nieaktualne.", 409);
}

/** Rywal przyjmuje zaproszenie („Gramy!”). */
export async function acceptDuel(db: Db, token: string | undefined, id: string): Promise<Duel> {
  const me = await requireProfile(db, token);
  await housekeeping(db);
  const r = await myRow(db, me, id);
  if (r.rival_id !== me.id) throw new UserError("To Twoje zaproszenie – czeka na rywala.", 409);
  requirePending(r);
  await getReady(db, me);
  if (await activeOf(db, r.inviter_id as string)) throw new UserError(`${r.i_name} gra już inny pojedynek.`, 409);
  await start(db, r, me.id);
  return getDuel(db, me, id);
}

/** Rywal odmawia („Nie teraz”). */
export async function declineDuel(db: Db, token: string | undefined, id: string) {
  const me = await requireProfile(db, token);
  const r = await myRow(db, me, id);
  if (r.rival_id !== me.id) throw new UserError("Nie ma takiego zaproszenia.", 404);
  await db.query("update duels set status = 'declined', updated_at = now() where id = $1 and status = 'pending'", [id]);
}

/** Zapraszający cofa zaproszenie albo któryś z graczy anuluje trwającą grę. */
export async function cancelDuel(db: Db, token: string | undefined, id: string) {
  const me = await requireProfile(db, token);
  const r = await myRow(db, me, id);
  if (r.status === "pending" && r.inviter_id !== me.id) throw new UserError("Zaproszenie możesz tylko odrzucić.", 409);
  await db.query(
    "update duels set status = 'cancelled', live = null, rev = rev + 1, updated_at = now() where id = $1 and status in ('pending', 'active')",
    [id],
  );
}

/** Zaproszenie z linku: kto zaprasza i czy ten telefon musi najpierw podać nazwę. */
export async function invitePreview(db: Db, token: string | undefined, code: string) {
  await housekeeping(db);
  const { rows } = await db.query(`${DUEL_SELECT} where d.invite_code = $1`, [String(code).toUpperCase()]);
  const r = rows[0];
  const profile = await myProfile(db, token);
  if (!r || r.status !== "pending" || r.rival_id) return { valid: false as const, profile };
  return {
    valid: true as const,
    profile,
    own: profile?.id === r.inviter_id,
    inviter: { name: r.i_name as string },
    target: r.target as number,
    inviterStarts: r.starter === "inviter",
  };
}

/** Nowa osoba otwiera link: (jeśli trzeba) zakłada profil i od razu przyjmuje grę. */
export async function acceptByCode(
  db: Db,
  token: string,
  code: string,
  input: { name?: unknown; look?: unknown },
): Promise<{ id: string }> {
  await housekeeping(db);
  const { rows } = await db.query("select * from duels where invite_code = $1", [String(code).toUpperCase()]);
  const r = rows[0];
  if (!r || r.status !== "pending" || r.rival_id) throw new UserError("To zaproszenie jest już nieaktualne.", 409);
  const me = (await myProfile(db, token)) ?? (await createGuestProfile(db, token, input.name, input.look));
  if (me.id === r.inviter_id) throw new UserError("To Twoje zaproszenie – pokaż kod rywalowi.", 409);
  await getReady(db, me);
  await start(db, r, me.id);
  return { id: r.id };
}

/** Ile mam czekać na serię: tylko gracz, który ma kolej, może coś wpisać. */
function requireMyTurn(r: Row, me: DuelProfile): GameState {
  if (r.status !== "active") throw new UserError("Ta gra już się nie toczy.", 409);
  const state = r.state as GameState;
  const now = currentPlayer(state);
  if (now?.id !== me.id) throw new UserError(`Teraz rzuca ${now?.name ?? "rywal"}.`, 409);
  return state;
}

function clientTime(v: unknown): number | undefined {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v <= Date.now() ? v : undefined;
}

async function saveState(db: Db, r: Row, state: GameState, extra: { status?: DuelStatus } = {}) {
  const over = isGameOver(state);
  const status = extra.status ?? (over ? "finished" : "active");
  const { rowCount } = await db.query(
    `update duels set state = $3, live = null, rev = rev + 1, status = $4, winner_id = $5,
            ended_at = case when $4 = 'finished' then now() else null end, updated_at = now()
      where id = $1 and rev = $2`,
    [r.id, r.rev, JSON.stringify(state), status, status === "finished" ? (finishOrder(state)[0] ?? null) : null],
  );
  if (!rowCount) throw new UserError("Stan gry właśnie się zmienił. Spróbuj jeszcze raz.", 409);
}

/** Moja seria (suma albo rzutki z polami). Serwer sam liczy przekroczenie i koniec gry. */
export async function submitDuelTurn(
  db: Db,
  token: string | undefined,
  id: string,
  input: { scored?: unknown; darts?: unknown; fields?: unknown; startedAt?: unknown },
): Promise<Duel> {
  const me = await requireProfile(db, token);
  const r = await myRow(db, me, id);
  const state = requireMyTurn(r, me);
  const darts = Array.isArray(input.darts) ? input.darts.map(Number) : undefined;
  const fields = Array.isArray(input.fields) ? input.fields.filter((f): f is string => typeof f === "string") : undefined;
  let next: GameState;
  try {
    next = applyTurn(state, Number(input.scored), darts, fields, {
      startedAt: state.turns.length === 0 ? clientTime(input.startedAt) : undefined,
    });
  } catch (e) {
    throw new UserError((e as Error).message);
  }
  await saveState(db, r, next);
  return getDuel(db, me, id);
}

/**
 * Cofnięcie mojej ostatniej serii – tylko zanim rywal zacznie wpisywać swoją.
 * Po zakończeniu gry można jeszcze przez chwilę cofnąć serię kończącą.
 */
export async function undoDuelTurn(db: Db, token: string | undefined, id: string): Promise<{ duel: Duel; turn: Turn }> {
  const me = await requireProfile(db, token);
  const r = await myRow(db, me, id);
  const state = r.state as GameState | null;
  const last = state?.turns.at(-1);
  const recentEnd = r.status === "finished" && !r.rematch_id && (await db.query(
    `select 1 from duels where id = $1 and ended_at > now() - interval '${UNDO_FINISHED}'`, [id],
  )).rowCount;
  if (!state || !last || (r.status !== "active" && !recentEnd)) throw new UserError("Tu nie ma już czego cofnąć.", 409);
  if (last.playerId !== me.id) throw new UserError("Cofnąć możesz tylko swoją serię.", 409);
  const live = r.live as DuelLive | null;
  if (live && live.playerId !== me.id && live.darts.length) throw new UserError("Rywal już wpisuje swoją serię.", 409);
  await saveState(db, r, undoLastTurn(state), { status: "active" });
  return { duel: await getDuel(db, me, id), turn: last };
}

/** Rzutki bieżącej serii, zanim się zamknie – rywal widzi je na żywo. */
export async function setDuelLive(
  db: Db,
  token: string | undefined,
  id: string,
  input: { rev?: unknown; darts?: unknown; labels?: unknown },
) {
  const me = await requireProfile(db, token);
  const r = await myRow(db, me, id);
  requireMyTurn(r, me);
  const darts = Array.isArray(input.darts) ? input.darts.map(Number) : [];
  const labels = Array.isArray(input.labels) ? input.labels.map(String) : [];
  if (darts.length > 2 || !darts.every(isValidDart) || labels.length !== darts.length || labels.some((l) => l.length > 4))
    throw new UserError("Nieprawidłowe rzutki.");
  // Spóźnione żądanie z poprzedniej serii (inne `rev`) niczego nie nadpisze.
  await db.query("update duels set live = $3 where id = $1 and rev = $2 and status = 'active'", [
    id,
    Number(input.rev),
    darts.length ? JSON.stringify({ playerId: me.id, darts, labels }) : null,
  ]);
}

/** Rewanż: nowe zaproszenie dla tego samego rywala; zaczyna przegrany. */
export async function rematchDuel(db: Db, token: string | undefined, id: string): Promise<{ id: string }> {
  const me = await requireProfile(db, token);
  await housekeeping(db);
  const r = await myRow(db, me, id);
  if (r.status !== "finished") throw new UserError("Rewanż można zaproponować po skończonej grze.", 409);
  if (r.rematch_id) return { id: r.rematch_id as string };
  const rivalId = (r.inviter_id === me.id ? r.rival_id : r.inviter_id) as string;
  await getReady(db, me);
  await requireFreeRival(db, rivalId);
  const loser = rematchStarter(r.state as GameState, (r.winner_id as string) ?? null);
  return { id: await insertInvite(db, me, rivalId, r.target as number, loser === me.id ? "inviter" : "rival", r.id as string) };
}

/** Moje zakończone gry 1 na 1 (opcjonalnie tylko z jednym rywalem). */
async function finishedDuels(db: Db, meId: string, rivalId?: string): Promise<FinishedDuel[]> {
  const { rows } = await db.query(
    `select id, target, state, winner_id, coalesce(ended_at, updated_at) as ended
       from duels
      where status = 'finished' and (inviter_id = $1 or rival_id = $1)
        and ($2::text is null or inviter_id = $2 or rival_id = $2)
      order by ended`,
    [meId, rivalId ?? null],
  );
  return rows.map((r) => ({
    id: r.id,
    target: r.target,
    state: r.state as GameState,
    winnerId: r.winner_id ?? null,
    endedAt: new Date(r.ended).getTime(),
  }));
}

export interface DuelSummary {
  profile: DuelProfile;
  totals: DuelTotals;
  /** Moje rekordy 1 na 1 (stan do liczenia nowych rekordów w trakcie gry). */
  records: RecordsState;
  /**
   * Forma z gier 1 na 1 – tylko dla gościa spoza ligi. Gracz ligi ma formę
   * (liga + 1 na 1) na swojej karcie gracza, więc tu null.
   */
  form: PlayerForm | null;
}

/** Ekran 1 na 1: mój bilans ze wszystkimi i moje rekordy. */
export async function duelSummary(db: Db, token: string | undefined, exceptId?: string): Promise<DuelSummary> {
  const me = await requireProfile(db, token);
  // Bez bieżącej gry: ekran wyników liczy z niej „nowe rekordy” względem wcześniejszych.
  const games = (await finishedDuels(db, me.id)).filter((g) => g.id !== exceptId);
  const { rows } = await db.query("select member_id from duel_profiles where id = $1", [me.id]);
  const guest = !rows[0]?.member_id;
  return {
    profile: me,
    totals: duelTotals(games, me.id),
    records: duelRecords(games, me.id),
    form: guest ? duelForm(games, me.id) : null,
  };
}

/** Ty vs rywal: bilans, porównanie i ostatnie wspólne gry. */
export async function rivalSummary(db: Db, token: string | undefined, rivalId: string): Promise<{ rival: DuelProfile; h2h: HeadToHead }> {
  const me = await requireProfile(db, token);
  const { rows } = await db.query("select * from duel_profiles where id = $1", [rivalId]);
  if (!rows[0] || rivalId === me.id) throw new UserError("Nie ma takiego gracza.", 404);
  const games = await finishedDuels(db, me.id, rivalId);
  const known = games.length > 0 || (await opponents(db, token)).some((o) => o.id === rivalId);
  if (!known) throw new UserError("Nie ma takiego gracza.", 404);
  const [, rival] = distinctLooks(me, toProfile(rows[0]));
  return { rival, h2h: headToHead(games, me.id, rivalId) };
}
