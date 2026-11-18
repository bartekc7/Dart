import { createHash, randomBytes, randomUUID } from "node:crypto";
import { applyTurn, createGame, isGameOver, standings } from "../game/engine";
import { ranking, RANKING_GAMES, type GameRecord, type RankingRow } from "../game/history";
import type { Turn } from "../game/types";
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
}

export interface League {
  id: string;
  name: string;
  joinCode: string;
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
    `select m.id, m.name, m.is_organizer, l.id as league_id, l.name as league_name, l.join_code
       from devices d join members m on m.id = d.member_id join leagues l on l.id = m.league_id
      where d.token_hash = $1`,
    [hashToken(token)],
  );
  const r = rows[0];
  if (!r) return null;
  await db.query("update devices set last_seen = now() where token_hash = $1", [hashToken(token)]);
  return {
    league: { id: r.league_id, name: r.league_name, joinCode: r.join_code },
    member: { id: r.id, name: r.name, isOrganizer: r.is_organizer, hasDevice: true },
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
    `select m.id, m.name, m.is_organizer, exists (select 1 from devices d where d.member_id = m.id) as has_device
       from members m where m.league_id = $1 order by m.is_organizer desc, lower(m.name)`,
    [leagueId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isOrganizer: r.is_organizer,
    hasDevice: r.has_device,
  }));
}

export async function leagueByCode(db: Db, code: string): Promise<League | null> {
  const { rows } = await db.query("select id, name, join_code from leagues where join_code = $1", [
    code.toUpperCase(),
  ]);
  return rows[0] ? { id: rows[0].id, name: rows[0].name, joinCode: rows[0].join_code } : null;
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
  return { id, name, isOrganizer: false, hasDevice: false };
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
}

async function requireMemberOfLeague(db: Db, leagueId: string, memberId: string) {
  const { rowCount } = await db.query("select 1 from members where id = $1 and league_id = $2", [
    memberId,
    leagueId,
  ]);
  if (!rowCount) throw new UserError("Nie ma takiego gracza w lidze.", 404);
}

/**
 * Zapis zakończonej gry. Serwer sam przelicza miejsca z serii, więc wyniki są
 * zawsze spójne z zasadami. Ponowny zapis tej samej gry (np. po cofnięciu i
 * poprawce) zastępuje poprzedni.
 */
export async function saveGame(
  db: Db,
  me: Me,
  input: { id?: unknown; target?: unknown; players?: unknown; turns?: unknown },
) {
  const id = typeof input.id === "string" && input.id.length <= 64 ? input.id : null;
  const target = Number(input.target);
  const playerIds = Array.isArray(input.players) ? input.players.filter((p) => typeof p === "string") : [];
  const turns = Array.isArray(input.turns) ? (input.turns as Turn[]) : [];
  if (!id || !Number.isInteger(target) || playerIds.length === 0)
    throw new UserError("Niepełne dane gry.");

  const members = await listMembers(db, me.league.id);
  const byId = new Map(members.map((m) => [m.id, m]));
  if (!playerIds.every((p) => byId.has(p))) throw new UserError("W grze jest gracz spoza ligi.");
  if (new Set(playerIds).size !== playerIds.length) throw new UserError("Gracz powtarza się w grze.");

  let state = createGame(playerIds.map((p) => ({ id: p, name: byId.get(p)!.name })), target);
  try {
    for (const t of turns) state = applyTurn(state, Number(t?.scored));
  } catch {
    throw new UserError("Nieprawidłowe serie w grze.");
  }
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
    [leagueId, RANKING_GAMES],
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
  return { rows: ranking(history), games: history.length };
}
