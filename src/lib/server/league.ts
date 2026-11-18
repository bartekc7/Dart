import { createHash, randomBytes, randomUUID } from "node:crypto";
import { applyTurn, createGame, endGame, isGameOver, standings } from "../game/engine";
import { rankingWithTrend, RANKING_GAMES, type GameRecord, type RankingRow } from "../game/history";
import type { EntryMode, GameState, Turn } from "../game/types";
import type { Db } from "./db";

/** Błąd, który pokazujemy użytkownikowi wprost (z kodem HTTP). */
export class UserError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export interface Member {
  id: string;
  name: string;
  isOrganizer: boolean;
  hasDevice: boolean;
  /** Numer koloru gracza w lidze (kolejność dołączenia), patrz lib/colors. */
  color: number;
}

export interface League {
  id: string;
  name: string;
  joinCode: string;
  /** Sposób wpisywania punktów w lidze; zmienia go tylko organizator. */
  entryMode: EntryMode;
  /** Czy organizator ma zapisany kod odzyskiwania (sam kod znamy tylko w chwili tworzenia). */
  hasRecoveryCode: boolean;
}

function toEntryMode(v: unknown): EntryMode {
  return v === "darts" ? "darts" : "sum";
}

export interface Me {
  league: League;
  member: Member;
}

export const MAX_NAME = 20;
export const MAX_LEAGUE_NAME = 40;
const CLAIM_TTL_HOURS = 48;

// Bez liter i cyfr łatwych do pomylenia (0/O, 1/I/L).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newJoinCode(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function newDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function cleanName(raw: unknown, max = MAX_NAME): string {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!name) throw new UserError("Podaj nazwę.");
  if (name.length > max) throw new UserError(`Nazwa może mieć najwyżej ${max} znaków.`);
  return name;
}

function isUniqueViolation(e: unknown) {
  return (e as { code?: string })?.code === "23505";
}

async function insertMember(db: Db, leagueId: string, name: string, organizer = false) {
  const id = randomUUID();
  try {
    await db.query(
      "insert into members (id, league_id, name, is_organizer) values ($1, $2, $3, $4)",
      [id, leagueId, name, organizer],
    );
  } catch (e) {
    if (isUniqueViolation(e)) throw new UserError(`W lidze jest już gracz „${name}”.`, 409);
    throw e;
  }
  return id;
}

async function bindDevice(db: Db, token: string, memberId: string) {
  await db.query(
    `insert into devices (token_hash, member_id) values ($1, $2)
     on conflict (token_hash) do update set member_id = excluded.member_id, last_seen = now()`,
    [hashToken(token), memberId],
  );
}

/** Zakłada ligę; zakładający zostaje organizatorem i jest przypisany do tego urządzenia. */
export async function createLeague(db: Db, token: string, leagueName: unknown, playerName: unknown) {
  const name = cleanName(leagueName, MAX_LEAGUE_NAME);
  const player = cleanName(playerName);
  const id = randomUUID();
  for (let attempt = 0; ; attempt++) {
    try {
      await db.query("insert into leagues (id, name, join_code) values ($1, $2, $3)", [
        id,
        name,
        newJoinCode(),
      ]);
      break;
    } catch (e) {
      if (!isUniqueViolation(e) || attempt > 3) throw e;
    }
  }
  const memberId = await insertMember(db, id, player, true);
  await bindDevice(db, token, memberId);
}

/** Kim jest to urządzenie (liga + gracz), albo null. */
export async function whoAmI(db: Db, token: string | undefined): Promise<Me | null> {
  if (!token) return null;
  const { rows } = await db.query(
    `select m.id, m.name, m.is_organizer, (select count(*) from members x where x.league_id = m.league_id and (x.created_at, x.id) < (m.created_at, m.id))::int as color, l.id as league_id, l.name as league_name, l.join_code, l.entry_mode, l.recovery_hash is not null as has_recovery
       from devices d join members m on m.id = d.member_id join leagues l on l.id = m.league_id
      where d.token_hash = $1`,
    [hashToken(token)],
  );
  const r = rows[0];
  if (!r) return null;
  await db.query("update devices set last_seen = now() where token_hash = $1", [hashToken(token)]);
  return {
    league: { id: r.league_id, name: r.league_name, joinCode: r.join_code, entryMode: toEntryMode(r.entry_mode), hasRecoveryCode: r.has_recovery },
    member: { id: r.id, name: r.name, isOrganizer: r.is_organizer, hasDevice: true, color: r.color },
  };
}

export async function requireMe(db: Db, token: string | undefined): Promise<Me> {
  const me = await whoAmI(db, token);
  if (!me) throw new UserError("Ten telefon nie należy do żadnej ligi.", 401);
  return me;
}

function requireOrganizer(me: Me) {
  if (!me.member.isOrganizer) throw new UserError("To może zrobić tylko organizator ligi.", 403);
}

export async function listMembers(db: Db, leagueId: string): Promise<Member[]> {
  const { rows } = await db.query(
    `select m.id, m.name, m.is_organizer, (select count(*) from members x where x.league_id = m.league_id and (x.created_at, x.id) < (m.created_at, m.id))::int as color, exists (select 1 from devices d where d.member_id = m.id) as has_device
       from members m where m.league_id = $1 order by m.is_organizer desc, lower(m.name)`,
    [leagueId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isOrganizer: r.is_organizer,
    hasDevice: r.has_device,
    color: r.color,
  }));
}

export async function leagueByCode(db: Db, code: string): Promise<League | null> {
  const { rows } = await db.query("select id, name, join_code, entry_mode, recovery_hash is not null as has_recovery from leagues where join_code = $1", [
    code.toUpperCase(),
  ]);
  return rows[0] ? { id: rows[0].id, name: rows[0].name, joinCode: rows[0].join_code, entryMode: toEntryMode(rows[0].entry_mode), hasRecoveryCode: rows[0].has_recovery } : null;
}

/** Dołączenie po linku: nowy gracz z podaną nazwą, przypisany do tego urządzenia. */
export async function joinLeague(db: Db, token: string, code: string, playerName: unknown) {
  const league = await leagueByCode(db, code);
  if (!league) throw new UserError("Nie ma ligi z takim kodem. Sprawdź link.", 404);
  const name = cleanName(playerName);
  try {
    const memberId = await insertMember(db, league.id, name);
    await bindDevice(db, token, memberId);
  } catch (e) {
    if (e instanceof UserError && e.status === 409)
      throw new UserError(
        `Gracz „${name}” już jest w tej lidze. Jeśli to Ty na nowym telefonie, poproś organizatora o link „Nowy telefon”.`,
        409,
      );
    throw e;
  }
}

/** Dodanie gracza bez telefonu (do wyboru przy nowej grze). */
export async function addMember(db: Db, me: Me, playerName: unknown): Promise<Member> {
  const name = cleanName(playerName);
  const id = await insertMember(db, me.league.id, name);
  return (await listMembers(db, me.league.id)).find((m) => m.id === id)!;
}

/** Organizator tworzy jednorazowy link, który przypisuje gracza do nowego telefonu. */
export async function createClaimToken(db: Db, me: Me, memberId: string): Promise<string> {
  requireOrganizer(me);
  await requireMemberOfLeague(db, me.league.id, memberId);
  const token = randomBytes(18).toString("base64url");
  await db.query(
    `insert into claim_tokens (token, member_id, expires_at)
     values ($1, $2, now() + make_interval(hours => $3))`,
    [token, memberId, CLAIM_TTL_HOURS],
  );
  return token;
}

export async function claimPreview(db: Db, claim: string) {
  const { rows } = await db.query(
    `select m.name, l.name as league_name from claim_tokens c
       join members m on m.id = c.member_id join leagues l on l.id = m.league_id
      where c.token = $1 and c.used_at is null and c.expires_at > now()`,
    [claim],
  );
  return rows[0] ? { playerName: rows[0].name as string, leagueName: rows[0].league_name as string } : null;
}

export async function claimDevice(db: Db, token: string, claim: string) {
  const { rows } = await db.query(
    `update claim_tokens set used_at = now()
      where token = $1 and used_at is null and expires_at > now() returning member_id`,
    [claim],
  );
  if (!rows[0]) throw new UserError("Ten link wygasł albo został już użyty. Poproś organizatora o nowy.", 410);
  await bindDevice(db, token, rows[0].member_id);
}

export async function makeOrganizer(db: Db, me: Me, memberId: string) {
  requireOrganizer(me);
  await requireMemberOfLeague(db, me.league.id, memberId);
  await db.query("update members set is_organizer = (id = $2) where league_id = $1", [
    me.league.id,
    memberId,
  ]);
  // Kod odzyskiwania należał do poprzedniego organizatora – nowy tworzy swój.
  await db.query("update leagues set recovery_hash = null where id = $1", [me.league.id]);
}

function normalizeRecoveryCode(raw: unknown): string {
  return typeof raw === "string" ? raw.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
}

/**
 * Nowy kod odzyskiwania ligi (np. „ABCD-EFGH-JKMN”). W bazie trzymamy tylko skrót,
 * więc kod widać jeden raz; nowy kod unieważnia poprzedni.
 */
export async function createRecoveryCode(db: Db, me: Me): Promise<string> {
  requireOrganizer(me);
  const raw = newJoinCode(12);
  await db.query("update leagues set recovery_hash = $2 where id = $1", [me.league.id, hashToken(raw)]);
  return raw.match(/.{4}/g)!.join("-");
}

/**
 * Organizator zgubił telefon: kod odzyskiwania przypisuje ten telefon do organizatora,
 * odłącza jego poprzednie telefony i przestaje działać (trzeba utworzyć nowy).
 */
export async function recoverWithCode(db: Db, token: string, code: unknown) {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) throw new UserError("Wpisz kod odzyskiwania.");
  const { rows } = await db.query(
    `select m.id from leagues l join members m on m.league_id = l.id and m.is_organizer
      where l.recovery_hash = $1 order by m.created_at limit 1`,
    [hashToken(normalized)],
  );
  if (!rows[0]) throw new UserError("Nieprawidłowy kod odzyskiwania. Sprawdź, czy przepisałeś go dokładnie.", 404);
  const memberId: string = rows[0].id;
  await db.query("delete from devices where member_id = $1 and token_hash <> $2", [memberId, hashToken(token)]);
  await bindDevice(db, token, memberId);
  await db.query("update leagues set recovery_hash = null where recovery_hash = $1", [hashToken(normalized)]);
}

/** Organizator ustala, jak w lidze wpisuje się punkty serii. */
export async function setEntryMode(db: Db, me: Me, mode: unknown) {
  requireOrganizer(me);
  if (mode !== "sum" && mode !== "darts") throw new UserError("Nieznany sposób wpisywania punktów.");
  await db.query("update leagues set entry_mode = $2 where id = $1", [me.league.id, mode]);
}

async function requireMemberOfLeague(db: Db, leagueId: string, memberId: string) {
  const { rowCount } = await db.query("select 1 from members where id = $1 and league_id = $2", [
    memberId,
    leagueId,
  ]);
  if (!rowCount) throw new UserError("Nie ma takiego gracza w lidze.", 404);
}

export interface GameInput {
  id?: unknown;
  target?: unknown;
  players?: unknown;
  turns?: unknown;
  /** true = gra zakończona przyciskiem „Zakończ grę”. */
  ended?: unknown;
}

/**
 * Odtwarza grę z serii według zasad (nie ufamy wynikom z telefonu) i sprawdza,
 * że wszyscy gracze są z ligi tego urządzenia.
 */
async function replayGame(db: Db, me: Me, input: GameInput): Promise<GameState> {
  const id = typeof input.id === "string" && input.id.length <= 64 ? input.id : null;
  const target = Number(input.target);
  const playerIds = Array.isArray(input.players) ? input.players.filter((p) => typeof p === "string") : [];
  const turns = Array.isArray(input.turns) ? (input.turns as Turn[]) : [];
  if (!id || !Number.isInteger(target) || target <= 0 || playerIds.length === 0)
    throw new UserError("Niepełne dane gry.");

  const members = await listMembers(db, me.league.id);
  const byId = new Map(members.map((m) => [m.id, m]));
  if (!playerIds.every((p) => byId.has(p))) throw new UserError("W grze jest gracz spoza ligi.");
  if (new Set(playerIds).size !== playerIds.length) throw new UserError("Gracz powtarza się w grze.");

  let state = createGame(playerIds.map((p) => ({ id: p, name: byId.get(p)!.name })), target);
  try {
    for (const t of turns) {
      const darts = Array.isArray(t?.darts) ? t.darts.map(Number) : undefined;
      state = applyTurn(state, Number(t?.scored), darts);
    }
    if (input.ended === true) state = endGame(state);
  } catch {
    throw new UserError("Nieprawidłowe serie w grze.");
  }
  return { ...state, id };
}

/** Trwająca gra widoczna dla całej ligi (podgląd na żywo). */
export interface LiveGame {
  id: string;
  state: GameState;
  scorer: { id: string | null; name: string | null };
  finished: boolean;
  updatedAt: string;
}

/** Jak długo pokazujemy grę: trwającą (bez ruchu) i zakończoną. */
const LIVE_STALE = "3 hours";
const FINISHED_VISIBLE = "10 minutes";

/**
 * Telefon, który liczy punkty, wysyła stan gry po każdej serii. `rev` rośnie
 * z każdą zmianą, więc spóźnione żądanie nie nadpisze nowszego stanu.
 */
export async function publishLiveGame(db: Db, me: Me, input: GameInput & { rev?: unknown }) {
  const rev = Number(input.rev);
  if (!Number.isSafeInteger(rev) || rev < 0) throw new UserError("Niepełne dane gry.");
  const state = await replayGame(db, me, input);
  const { rowCount } = await db.query(
    `insert into live_games (id, league_id, state, scorer_id, finished, rev)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (id) do update
       set state = excluded.state, scorer_id = excluded.scorer_id, finished = excluded.finished,
           rev = excluded.rev, updated_at = now()
     where live_games.league_id = excluded.league_id and live_games.rev < excluded.rev`,
    [state.id, me.league.id, JSON.stringify(state), me.member.id, isGameOver(state), rev],
  );
  return { updated: rowCount === 1 };
}

const LIVE_SELECT = `
  select g.id, g.state, g.finished, g.updated_at, g.scorer_id, m.name as scorer_name
    from live_games g left join members m on m.id = g.scorer_id
   where g.league_id = $1
     and ((not g.finished and g.updated_at > now() - interval '${LIVE_STALE}')
       or (g.finished and g.updated_at > now() - interval '${FINISHED_VISIBLE}'))`;

function toLive(r: Record<string, unknown>): LiveGame {
  return {
    id: r.id as string,
    state: r.state as GameState,
    scorer: { id: (r.scorer_id as string) ?? null, name: (r.scorer_name as string) ?? null },
    finished: r.finished as boolean,
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

export async function liveGames(db: Db, leagueId: string): Promise<LiveGame[]> {
  const { rows } = await db.query(`${LIVE_SELECT} order by g.updated_at desc limit 5`, [leagueId]);
  return rows.map(toLive);
}

export async function liveGame(db: Db, leagueId: string, id: string): Promise<LiveGame | null> {
  const { rows } = await db.query(`${LIVE_SELECT} and g.id = $2`, [leagueId, id]);
  return rows[0] ? toLive(rows[0]) : null;
}

/** Ostatnie gry danego gracza (z miejscem), najnowsze pierwsze. */
export interface MyGame {
  id: string;
  finishedAt: string;
  target: number;
  place: number;
  players: number;
}

export async function recentGamesOf(db: Db, memberId: string, limit = 5): Promise<MyGame[]> {
  const { rows } = await db.query(
    `select g.id, g.finished_at, g.target, r.place,
            (select count(*)::int from game_results x where x.game_id = g.id) as players
       from game_results r join games g on g.id = r.game_id
      where r.member_id = $1
      order by g.finished_at desc limit $2`,
    [memberId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    finishedAt: new Date(r.finished_at).toISOString(),
    target: r.target,
    place: r.place,
    players: r.players,
  }));
}

/**
 * Zapis zakończonej gry. Serwer sam przelicza miejsca z serii, więc wyniki są
 * zawsze spójne z zasadami. Ponowny zapis tej samej gry (np. po cofnięciu i
 * poprawce) zastępuje poprzedni.
 */
export async function saveGame(db: Db, me: Me, input: GameInput) {
  const state = await replayGame(db, me, input);
  const id = state.id!;
  const target = state.settings.target;
  if (!isGameOver(state)) throw new UserError("Gra nie jest zakończona.");

  const { rows } = await db.query("select league_id from games where id = $1", [id]);
  if (rows[0] && rows[0].league_id !== me.league.id) throw new UserError("Nie można zapisać tej gry.", 403);

  await db.query("delete from games where id = $1", [id]);
  await db.query(
    "insert into games (id, league_id, target, turns, created_by) values ($1, $2, $3, $4, $5)",
    [id, me.league.id, target, JSON.stringify(state.turns), me.member.id],
  );
  for (const s of standings(state)) {
    await db.query("insert into game_results (game_id, member_id, place) values ($1, $2, $3)", [
      id,
      s.player.id,
      s.place,
    ]);
  }
}

export async function deleteGame(db: Db, me: Me, id: string) {
  await db.query("delete from games where id = $1 and league_id = $2", [id, me.league.id]);
}

export async function leagueRanking(db: Db, leagueId: string): Promise<{ rows: RankingRow[]; games: number }> {
  const { rows } = await db.query(
    `with recent as (
       select g.id, g.target, g.finished_at from games g
        where g.league_id = $1
          and (select count(*) from game_results r where r.game_id = g.id) > 1
        order by g.finished_at desc limit $2)
     select recent.id, recent.target, recent.finished_at, r.member_id, m.name, r.place
       from recent join game_results r on r.game_id = recent.id join members m on m.id = r.member_id
      order by recent.finished_at desc, r.place`,
    [leagueId, RANKING_GAMES + 1],
  );
  const games = new Map<string, GameRecord>();
  for (const r of rows) {
    const g: GameRecord = games.get(r.id) ?? {
      id: r.id,
      finishedAt: new Date(r.finished_at).toISOString(),
      target: r.target,
      results: [],
    };
    g.results.push({ id: r.member_id, name: r.name, place: r.place });
    games.set(r.id, g);
  }
  const history = [...games.values()];
  return { rows: rankingWithTrend(history), games: Math.min(history.length, RANKING_GAMES) };
}

/** Przerwana gra znika z podglądu (np. „Zacznij nową grę” w trakcie). */
export async function deleteLiveGame(db: Db, me: Me, id: string) {
  await db.query("delete from live_games where id = $1 and league_id = $2", [id, me.league.id]);
}
