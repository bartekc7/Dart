import { createHash, randomBytes, randomUUID } from "node:crypto";
import { applyTurn, createGame, endGame, gameDuration, gameEnd, gameStart, isGameOver, standings } from "../game/engine";
import { rankingWithTrend, RANKING_GAMES, type GameRecord, type RankingRow } from "../game/history";
import { computeLeagueStats, type LeagueStats } from "../game/leagueStats";
import { computeProgress, type AchGame, type AchProgress } from "../game/achievements";
import { computeRecords, type RecordsState } from "../game/records";
import type { EntryMode, GameState, Turn } from "../game/types";
import type { Db } from "./db";
import { defaultLook, lookKey, parseLook, type Look, type LookKey } from "../looks";

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
  /** Numer koloru gracza (lib/colors); -1 gdy gracz wybrał ikonkę. */
  color: number;
  /** Ikonka gracza (lib/looks) zamiast koloru albo null. */
  icon: string | null;
  /** Nieaktywny = usunięty gracz z grami: zostaje ze starą nazwą, ale nie da się go wybrać do gry. */
  active: boolean;
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

/** Znaki (kolory i ikonki) zajęte w lidze, także przez nieaktywnych graczy. */
export async function takenLooks(db: Db, leagueId: string, exceptId?: string): Promise<LookKey[]> {
  const { rows } = await db.query(
    `select m.color_idx, m.icon, (select count(*) from members x where x.league_id = m.league_id and (x.created_at, x.id) < (m.created_at, m.id))::int as rank
       from members m where m.league_id = $1 and m.id <> coalesce($2, '')`,
    [leagueId, exceptId ?? null],
  );
  return rows.map((r) => lookKey({ color: r.color_idx ?? r.rank, icon: r.icon }));
}

/** Wybrany znak (np. „icon:🐛”) albo domyślny, gdy gracz nic nie wybrał. */
async function resolveLook(db: Db, leagueId: string, raw: unknown, exceptId?: string): Promise<Look> {
  const taken = await takenLooks(db, leagueId, exceptId);
  if (raw === undefined || raw === null || raw === "") {
    const { rows } = await db.query("select count(*)::int as n from members where league_id = $1", [leagueId]);
    return defaultLook(rows[0].n, taken);
  }
  const look = parseLook(raw);
  if (!look) throw new UserError("Nieznany kolor albo ikonka.");
  if (taken.includes(lookKey(look))) throw takenLook(look);
  return look;
}

/** Wybrany kolor/ikonka jest zajęty (inny błąd niż zajęta nazwa). */
class LookTakenError extends UserError {}

function takenLook(look: Look) {
  return new LookTakenError(
    look.icon ? "Tę ikonkę ma już inny gracz. Wybierz inną." : "Ten kolor ma już inny gracz. Wybierz inny.",
    409,
  );
}

async function insertMember(db: Db, leagueId: string, name: string, organizer = false, rawLook?: unknown) {
  const id = randomUUID();
  try {
    const { rows } = await db.query(
      "select 1 from members where league_id = $1 and lower(name) = lower($2)",
      [leagueId, name],
    );
    // Powracający nieaktywny gracz zachowuje swój znak (niżej), więc wybór sprawdzamy tylko dla nowych.
    const look = rows[0] ? { color: 0, icon: null } : await resolveLook(db, leagueId, rawLook);
    await db.query(
      "insert into members (id, league_id, name, is_organizer, color_idx, icon) values ($1, $2, $3, $4, $5, $6)",
      [id, leagueId, name, organizer, look.color, look.icon],
    );
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    if ((e as { constraint?: string }).constraint === "members_league_icon")
      throw takenLook({ color: null, icon: "?" });
    // Ta sama nazwa co usunięty gracz z grami: przywracamy go razem z jego wynikami.
    const { rows } = await db.query(
      "update members set active = true where league_id = $1 and lower(name) = lower($2) and not active returning id",
      [leagueId, name],
    );
    if (rows[0]) return rows[0].id as string;
    throw new UserError(`W lidze jest już gracz „${name}”.`, 409);
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
export async function createLeague(db: Db, token: string, leagueName: unknown, playerName: unknown, look?: unknown) {
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
  const memberId = await insertMember(db, id, player, true, look);
  await bindDevice(db, token, memberId);
}

/** Kim jest to urządzenie (liga + gracz), albo null. */
export async function whoAmI(db: Db, token: string | undefined): Promise<Me | null> {
  if (!token) return null;
  const { rows } = await db.query(
    `select m.id, m.name, m.is_organizer, case when m.icon is not null then -1 else coalesce(m.color_idx, (select count(*) from members x where x.league_id = m.league_id and (x.created_at, x.id) < (m.created_at, m.id))::int) end as color, m.icon, l.id as league_id, l.name as league_name, l.join_code, l.entry_mode, l.recovery_hash is not null as has_recovery
       from devices d join members m on m.id = d.member_id join leagues l on l.id = m.league_id
      where d.token_hash = $1 and m.active`,
    [hashToken(token)],
  );
  const r = rows[0];
  if (!r) return null;
  await db.query("update devices set last_seen = now() where token_hash = $1", [hashToken(token)]);
  return {
    league: { id: r.league_id, name: r.league_name, joinCode: r.join_code, entryMode: toEntryMode(r.entry_mode), hasRecoveryCode: r.has_recovery },
    member: { id: r.id, name: r.name, isOrganizer: r.is_organizer, hasDevice: true, color: r.color, icon: r.icon ?? null, active: true },
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

/** Aktywni gracze ligi; `withInactive` dokłada też usuniętych, którzy mają gry (np. do karty gracza). */
export async function listMembers(db: Db, leagueId: string, withInactive = false): Promise<Member[]> {
  const { rows } = await db.query(
    `select m.id, m.name, m.is_organizer, m.active, case when m.icon is not null then -1 else coalesce(m.color_idx, (select count(*) from members x where x.league_id = m.league_id and (x.created_at, x.id) < (m.created_at, m.id))::int) end as color, m.icon, exists (select 1 from devices d where d.member_id = m.id) as has_device
       from members m where m.league_id = $1 and (m.active or $2) order by m.active desc, m.is_organizer desc, lower(m.name)`,
    [leagueId, withInactive],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isOrganizer: r.is_organizer,
    hasDevice: r.has_device,
    color: r.color,
    icon: r.icon ?? null,
    active: r.active,
  }));
}

/** Nieaktywni gracze ligi (usunięci, ale z rozegranymi grami) – pokazywani wyszarzeni. */
export async function inactiveMembers(db: Db, leagueId: string): Promise<Member[]> {
  return (await listMembers(db, leagueId, true)).filter((m) => !m.active);
}

/**
 * Zmiana nazwy gracza: każdy zmienia swoją, organizator także innym.
 * Nazwa musi być unikalna w lidze (bez względu na wielkość liter), łącznie
 * z nieaktywnymi graczami. Gry i ranking są powiązane po id, więc wszędzie
 * od razu widać nową nazwę.
 */
export async function renameMember(db: Db, me: Me, memberId: string, rawName: unknown): Promise<Member> {
  if (memberId !== me.member.id) requireOrganizer(me);
  await requireMemberOfLeague(db, me.league.id, memberId);
  const name = cleanName(rawName);
  const { rows } = await db.query(
    "select active from members where league_id = $1 and lower(name) = lower($2) and id <> $3",
    [me.league.id, name, memberId],
  );
  if (rows[0]) throw takenName(name, rows[0].active);
  try {
    await db.query("update members set name = $3 where id = $1 and league_id = $2", [memberId, me.league.id, name]);
  } catch (e) {
    if (isUniqueViolation(e)) throw takenName(name, true);
    throw e;
  }
  return (await listMembers(db, me.league.id)).find((m) => m.id === memberId)!;
}

/**
 * Zmiana znaku (kolor albo ikonka): każdy swój, organizator także innym.
 * Znak nie może się powtarzać w lidze (łącznie z nieaktywnymi graczami).
 */
export async function setMemberLook(db: Db, me: Me, memberId: string, raw: unknown): Promise<Member> {
  if (memberId !== me.member.id) requireOrganizer(me);
  await requireMemberOfLeague(db, me.league.id, memberId);
  const look = parseLook(raw);
  if (!look) throw new UserError("Nieznany kolor albo ikonka.");
  if ((await takenLooks(db, me.league.id, memberId)).includes(lookKey(look))) throw takenLook(look);
  try {
    await db.query("update members set color_idx = $3, icon = $4 where id = $1 and league_id = $2", [
      memberId,
      me.league.id,
      look.color,
      look.icon,
    ]);
  } catch (e) {
    if (isUniqueViolation(e)) throw takenLook(look);
    throw e;
  }
  return (await listMembers(db, me.league.id, true)).find((m) => m.id === memberId)!;
}

function takenName(name: string, active: boolean) {
  return new UserError(
    active
      ? `W lidze jest już gracz „${name}”. Wybierz inną nazwę.`
      : `Nazwa „${name}” należy do nieaktywnego gracza. Wybierz inną.`,
    409,
  );
}

export async function leagueByCode(db: Db, code: string): Promise<League | null> {
  const { rows } = await db.query("select id, name, join_code, entry_mode, recovery_hash is not null as has_recovery from leagues where join_code = $1", [
    code.toUpperCase(),
  ]);
  return rows[0] ? { id: rows[0].id, name: rows[0].name, joinCode: rows[0].join_code, entryMode: toEntryMode(rows[0].entry_mode), hasRecoveryCode: rows[0].has_recovery } : null;
}

/** Dołączenie po linku: nowy gracz z podaną nazwą, przypisany do tego urządzenia. */
export async function joinLeague(db: Db, token: string, code: string, playerName: unknown, look?: unknown) {
  const league = await leagueByCode(db, code);
  if (!league) throw new UserError("Nie ma ligi z takim kodem. Sprawdź link.", 404);
  const name = cleanName(playerName);
  try {
    const memberId = await insertMember(db, league.id, name, false, look);
    await bindDevice(db, token, memberId);
  } catch (e) {
    if (e instanceof UserError && e.status === 409 && !(e instanceof LookTakenError))
      throw new UserError(
        `Gracz „${name}” już jest w tej lidze. Jeśli to Ty na nowym telefonie, poproś organizatora o link „Nowy telefon”.`,
        409,
      );
    throw e;
  }
}

/** Dodanie gracza bez telefonu (do wyboru przy nowej grze). */
export async function addMember(db: Db, me: Me, playerName: unknown, look?: unknown): Promise<Member> {
  const name = cleanName(playerName);
  const id = await insertMember(db, me.league.id, name, false, look);
  return (await listMembers(db, me.league.id)).find((m) => m.id === id)!;
}

/**
 * Jednorazowy link, który przypisuje gracza do kolejnego telefonu (poprzednie zostają).
 * Dla innych graczy tworzy go organizator, dla siebie (drugie urządzenie) każdy.
 */
export async function createClaimToken(db: Db, me: Me, memberId: string): Promise<string> {
  if (memberId !== me.member.id) requireOrganizer(me);
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

/**
 * Organizator usuwa gracza z ligi: znika z listy, rankingu i historii, a jego
 * telefony zostają odłączone. Organizatora (siebie) usunąć się nie da.
 */
export async function removeMember(db: Db, me: Me, memberId: string) {
  requireOrganizer(me);
  if (memberId === me.member.id) throw new UserError("Nie możesz usunąć siebie.");
  await requireMemberOfLeague(db, me.league.id, memberId);
  const { rowCount } = await db.query("select 1 from game_results where member_id = $1 limit 1", [memberId]);
  if (rowCount) {
    // Gracz z grami: tylko dezaktywacja, żeby ranking i historia zostały bez zmian.
    await db.query("update members set active = false, is_organizer = false where id = $1", [memberId]);
    await db.query("delete from devices where member_id = $1", [memberId]);
    await db.query("delete from claim_tokens where member_id = $1", [memberId]);
  } else {
    await db.query("delete from members where id = $1 and league_id = $2", [memberId, me.league.id]);
  }
}

export type ClearMode = "games" | "all";

/**
 * „Wyczyść ligę”: same gry (ranking od zera) albo gry i wszyscy gracze poza
 * organizatorem. Dla bezpieczeństwa trzeba podać nazwę ligi.
 */
export async function clearLeague(db: Db, me: Me, mode: unknown, confirmName: unknown) {
  requireOrganizer(me);
  if (mode !== "games" && mode !== "all") throw new UserError("Nieznany sposób czyszczenia.");
  const typed = typeof confirmName === "string" ? confirmName.trim().toLowerCase() : "";
  if (typed !== me.league.name.trim().toLowerCase())
    throw new UserError("Wpisz dokładnie nazwę ligi, żeby potwierdzić.");
  await db.query("delete from games where league_id = $1", [me.league.id]);
  await db.query("delete from live_games where league_id = $1", [me.league.id]);
  // Usunięci gracze byli trzymani tylko dla swoich gier, a tych już nie ma.
  await db.query("delete from members where league_id = $1 and not active", [me.league.id]);
  if (mode === "all")
    await db.query("delete from members where league_id = $1 and id <> $2", [me.league.id, me.member.id]);
}

async function requireMemberOfLeague(db: Db, leagueId: string, memberId: string) {
  const { rowCount } = await db.query("select 1 from members where id = $1 and league_id = $2 and active", [
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
  /** Pierwsza rzutka gry (ms). */
  startedAt?: unknown;
}

/** Najdłuższa gra, której czas zapisujemy (dłuższa to raczej zapomniany telefon). */
const MAX_GAME_MS = 12 * 60 * 60 * 1000;

/** Czas z telefonu: liczba ms, nie z przyszłości (z zapasem na rozjechany zegar). */
function clientTime(v: unknown): number | null {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v < Date.now() + 60 * 60 * 1000 ? v : null;
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
      const fields = Array.isArray(t?.fields) ? t.fields.filter((f) => typeof f === "string") : undefined;
      const startedAt = clientTime(input.startedAt) ?? undefined;
      state = applyTurn(state, Number(t?.scored), darts, fields, { at: clientTime(t?.at), startedAt });
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

  // Czas gry: od pierwszej rzutki do ostatniej serii (stare wersje aplikacji go nie wysyłają).
  const duration = gameDuration(state);
  const timed = duration !== null && duration <= MAX_GAME_MS;
  const startedAt = timed ? new Date(gameStart(state)!) : null;
  const endedAt = timed ? new Date(gameEnd(state)!) : null;

  await db.query("delete from games where id = $1", [id]);
  await db.query(
    `insert into games (id, league_id, target, turns, created_by, started_at, ended_at)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [id, me.league.id, target, JSON.stringify(state.turns), me.member.id, startedAt, endedAt],
  );
  for (const s of standings(state)) {
    await db.query("insert into game_results (game_id, member_id, place) values ($1, $2, $3)", [
      id,
      s.player.id,
      s.place,
    ]);
  }
}

/**
 * Usunięcie gry z rankingu: organizator (np. gra zapisana przez pomyłkę) albo
 * telefon, który ją zapisał (cofnięcie ostatniej serii na ekranie wyników).
 */
export async function deleteGame(db: Db, me: Me, id: string) {
  const { rows } = await db.query("select created_by from games where id = $1 and league_id = $2", [
    id,
    me.league.id,
  ]);
  if (!rows[0]) return;
  if (!me.member.isOrganizer && rows[0].created_by !== me.member.id)
    throw new UserError("Grę może usunąć tylko organizator albo osoba, która ją zapisała.", 403);
  await db.query("delete from games where id = $1 and league_id = $2", [id, me.league.id]);
}

export const HISTORY_GAMES = 50;

/** Historia gier ligi (od najnowszej) z miejscami graczy. */
export async function leagueGames(db: Db, leagueId: string, limit = HISTORY_GAMES): Promise<GameRecord[]> {
  const { rows } = await db.query(
    `with recent as (
       select id, target, finished_at, started_at, ended_at from games where league_id = $1
        order by finished_at desc limit $2)
     select recent.id, recent.target, recent.finished_at, r.member_id, m.name, r.place,
            (extract(epoch from recent.ended_at - recent.started_at) * 1000)::bigint as duration_ms
       from recent join game_results r on r.game_id = recent.id join members m on m.id = r.member_id
      order by recent.finished_at desc, recent.id, r.place`,
    [leagueId, limit],
  );
  const games = new Map<string, GameRecord>();
  for (const r of rows) {
    const g: GameRecord = games.get(r.id) ?? {
      id: r.id,
      finishedAt: new Date(r.finished_at).toISOString(),
      target: r.target,
      ...(r.duration_ms != null ? { durationMs: Number(r.duration_ms) } : {}),
      results: [],
    };
    g.results.push({ id: r.member_id, name: r.name, place: r.place });
    games.set(r.id, g);
  }
  return [...games.values()];
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

export interface MemberStats {
  id: string;
  name: string;
  color: number;
  icon: string | null;
  active: boolean;
  /** Gry ligowe (co najmniej dwóch graczy). */
  games: number;
  wins: number;
  /** Średnie miejsce, null gdy brak gier. */
  avgPlace: number | null;
  /** Rzucone serie i średnio punktów na serię (przekroczenia liczą się jako 0). */
  series: number;
  avgPerSeries: number;
  bestSeries: number;
  busts: number;
  /** Ostatnie gry, od najnowszej. */
  recent: MyGame[];
  /** Trafienia w pola tarczy (np. { T20: 4, "5": 9 }) z rzutek wpisywanych osobno; „0” = pudła. */
  hits: Record<string, number>;
  /** Z ilu gier pochodzą trafienia. */
  hitGames: number;
}

/** Karta gracza: statystyki ze wszystkich gier ligowych gracza. */
export async function memberStats(db: Db, leagueId: string, memberId: string): Promise<MemberStats> {
  const member = (await listMembers(db, leagueId, true)).find((m) => m.id === memberId);
  if (!member) throw new UserError("Nie ma takiego gracza w lidze.", 404);
  const { rows } = await db.query(
    `select g.id, g.finished_at, g.target, g.turns, r.place,
            (select count(*)::int from game_results x where x.game_id = g.id) as players
       from game_results r join games g on g.id = r.game_id
      where r.member_id = $1 and g.league_id = $2
        and (select count(*) from game_results x where x.game_id = g.id) > 1
      order by g.finished_at desc`,
    [memberId, leagueId],
  );
  let series = 0;
  let points = 0;
  let best = 0;
  let busts = 0;
  const hits: Record<string, number> = {};
  let hitGames = 0;
  for (const g of rows) {
    let counted = false;
    for (const t of (g.turns as Turn[]) ?? []) {
      if (t.playerId !== memberId) continue;
      for (const f of t.fields ?? []) {
        hits[f] = (hits[f] ?? 0) + 1;
        counted = true;
      }
      series++;
      if (t.bust) busts++;
      else {
        points += t.scored;
        best = Math.max(best, t.scored);
      }
    }
    if (counted) hitGames++;
  }
  return {
    id: member.id,
    name: member.name,
    color: member.color,
    icon: member.icon,
    active: member.active,
    games: rows.length,
    wins: rows.filter((g) => g.place === 1).length,
    avgPlace: rows.length ? rows.reduce((s, g) => s + g.place, 0) / rows.length : null,
    series,
    avgPerSeries: series ? points / series : 0,
    bestSeries: best,
    busts,
    hits,
    hitGames,
    recent: rows.slice(0, 10).map((r) => ({
      id: r.id,
      finishedAt: new Date(r.finished_at).toISOString(),
      target: r.target,
      place: r.place,
      players: r.players,
    })),
  };
}

/**
 * Statystyki całej ligi ze wszystkich gier. Czas gry (started_at/ended_at)
 * czytamy przez to_jsonb, więc zapytanie działa także zanim te kolumny powstaną.
 */
export async function leagueStats(db: Db, leagueId: string): Promise<LeagueStats> {
  const [members, { rows }] = await Promise.all([
    listMembers(db, leagueId, true),
    db.query(
      `select g.id, g.finished_at, g.target, g.turns,
              to_jsonb(g) ->> 'started_at' as started_at, to_jsonb(g) ->> 'ended_at' as ended_at,
              coalesce((select json_agg(json_build_object('memberId', r.member_id, 'place', r.place))
                          from game_results r where r.game_id = g.id), '[]') as results
         from games g
        where g.league_id = $1
        order by g.finished_at desc`,
      [leagueId],
    ),
  ]);
  return computeLeagueStats(
    rows.map((r) => ({
      id: r.id,
      finishedAt: new Date(r.finished_at).toISOString(),
      target: r.target,
      turns: (r.turns as Turn[]) ?? [],
      results: r.results,
      startedAt: r.started_at ? new Date(r.started_at).toISOString() : null,
      endedAt: r.ended_at ? new Date(r.ended_at).toISOString() : null,
    })),
    members.map((m) => ({ id: m.id, name: m.name, color: m.color, icon: m.icon })),
  );
}

/**
 * Osiągnięcia wszystkich graczy ligi, liczone z historii gier od najstarszej.
 * `exclude` pomija jedną grę – telefon w trakcie gry dokłada ją sam,
 * żeby wiedzieć, co jest nowe (także gdy gra była już raz zapisana).
 */
export async function leagueAchievements(
  db: Db,
  leagueId: string,
  exclude?: string,
): Promise<{ members: Record<string, AchProgress>; records: RecordsState }> {
  const { rows } = await db.query(
    `select g.id, g.finished_at, g.target, g.turns,
            coalesce((select json_object_agg(r.member_id, r.place)
                        from game_results r where r.game_id = g.id), '{}') as places
       from games g
      where g.league_id = $1 and g.id <> $2
      order by g.finished_at asc, g.id`,
    [leagueId, exclude ?? ""],
  );
  const games: AchGame[] = rows.map((r) => {
    const places = r.places as Record<string, number>;
    return {
      id: r.id,
      target: r.target,
      players: Object.keys(places),
      turns: (r.turns as Turn[]) ?? [],
      at: new Date(r.finished_at).getTime(),
      places,
    };
  });
  // Osiągnięcia i rekordy z tej samej historii: jedno zapytanie, dwie odpowiedzi.
  return { members: computeProgress(games), records: computeRecords(games) };
}
