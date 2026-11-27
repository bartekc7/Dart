/**
 * Rekordy: liczby, które da się bić wiele razy (w odróżnieniu od osiągnięć,
 * które są jednorazowymi odznakami za stały próg). Liczone z historii gier,
 * bez osobnej tabeli. Każdy rekord jest osobisty i ligowy.
 *
 * Klucze: "series" (najlepsza seria), "fastest:<cel>" (najmniej serii do
 * wygranej przy danym celu, np. fastest:101) i "average" (najlepsza średnia
 * na serię w jednym meczu).
 */
import type { AchGame } from "./achievements";

export interface RecordValue {
  memberId: string;
  value: number;
  /** Kiedy ustanowiony (ms). */
  at: number;
}

export interface RecordsState {
  league: Record<string, RecordValue>;
  personal: Record<string, Record<string, RecordValue>>;
  /** Liczba serii gracza (do progu rekordów osobistych). */
  series: Record<string, number>;
  /** Liczba zakończonych gier ligi (do progu rekordów ligi). */
  games: number;
}

export interface RecordEvent {
  memberId: string;
  key: string;
  /** league = nowy rekord ligi (zawiera też osobisty), personal = tylko osobisty. */
  scope: "league" | "personal";
  value: number;
  /** Poprzedni rekord (ligi albo gracza – zależnie od scope). */
  prev: RecordValue;
  at: number;
}

/** Rekord osobisty dopiero po tylu seriach gracza – żeby nowi nie dostawali dymka co serię. */
export const MIN_PERSONAL_SERIES = 10;
/** Średnia meczu liczy się od tylu serii (krótsze mecze to przypadek). */
export const MIN_AVG_SERIES = 3;
/** Rekord ligi ogłaszamy dopiero, gdy liga ma za sobą kilka gier (inaczej pada co serię). */
export const MIN_LEAGUE_GAMES = 3;

export function emptyRecords(): RecordsState {
  return { league: {}, personal: {}, series: {}, games: 0 };
}

const lowerIsBetter = (key: string) => key.startsWith("fastest:");
const beats = (key: string, value: number, prev: RecordValue | undefined) =>
  !prev || (lowerIsBetter(key) ? value < prev.value : value > prev.value);

/** Nazwa rekordu do wyświetlenia. */
export function recordLabel(key: string): string {
  if (key === "series") return "Najlepsza seria";
  if (key === "average") return "Najlepsza średnia w meczu";
  if (key.startsWith("fastest:")) return `Najszybsza wygrana do ${key.slice(8)}`;
  return key;
}

function seriesWord(n: number) {
  if (n === 1) return "seria";
  const few = n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
  return few ? "serie" : "serii";
}

/** Wartość rekordu z jednostką, np. „100”, „4 serie”, „38,5”. */
export function formatRecord(key: string, value: number): string {
  if (key === "average") return value.toFixed(1).replace(".", ",");
  if (key.startsWith("fastest:")) return `${value} ${seriesWord(value)}`;
  return String(value);
}

/** Kolejność rekordów na karcie gracza. */
export function recordOrder(key: string): number {
  if (key === "series") return 0;
  if (key === "average") return 9999;
  return 1 + Number(key.slice(8));
}

/**
 * Dokłada grę (zapisaną albo trwającą) do rekordów i zwraca nowe rekordy
 * oraz zdarzenia „nowy rekord” w kolejności serii. Bez mutacji `prev`.
 * Zdarzenie powstaje tylko, gdy był już poprzedni rekord do pobicia
 * (pierwsza wartość w historii to nie jest „bicie”), a remis się nie liczy.
 */
export function addRecordsGame(prev: RecordsState, game: AchGame): { state: RecordsState; events: RecordEvent[] } {
  const events: RecordEvent[] = [];
  if (game.players.length < 2) return { state: prev, events };
  const state: RecordsState = {
    league: { ...prev.league },
    personal: Object.fromEntries(Object.entries(prev.personal).map(([k, v]) => [k, { ...v }])),
    series: { ...prev.series },
    games: prev.games,
  };
  const leagueReady = prev.games >= MIN_LEAGUE_GAMES;

  const offer = (memberId: string, key: string, value: number, at: number, personalReady: boolean) => {
    const rec: RecordValue = { memberId, value, at };
    const mine = (state.personal[memberId] ??= {});
    const lg = state.league[key];
    const pb = mine[key];
    if (lg && leagueReady && beats(key, value, lg)) events.push({ memberId, key, scope: "league", value, prev: lg, at });
    else if (pb && personalReady && beats(key, value, pb)) events.push({ memberId, key, scope: "personal", value, prev: pb, at });
    if (beats(key, value, lg)) state.league[key] = rec;
    if (beats(key, value, pb)) mine[key] = rec;
  };

  const scored = new Map(game.players.map((id) => [id, 0]));
  const turns = new Map(game.players.map((id) => [id, 0]));
  let finishers = 0;
  for (const t of game.turns) {
    if (!scored.has(t.playerId)) continue;
    const at = t.at ?? game.at;
    const before = state.series[t.playerId] ?? 0;
    turns.set(t.playerId, (turns.get(t.playerId) ?? 0) + 1);
    state.series[t.playerId] = before + 1;
    if (t.bust) continue;
    offer(t.playerId, "series", t.scored, at, before >= MIN_PERSONAL_SERIES);
    scored.set(t.playerId, scored.get(t.playerId)! + t.scored);
    if (scored.get(t.playerId) === game.target) {
      finishers++;
      if (finishers === 1) offer(t.playerId, `fastest:${game.target}`, turns.get(t.playerId)!, at, true);
    }
  }

  if (game.places) {
    state.games++;
    for (const id of game.players) {
      const n = turns.get(id) ?? 0;
      if (n < MIN_AVG_SERIES) continue;
      const avg = Math.round(((scored.get(id) ?? 0) / n) * 10) / 10;
      offer(id, "average", avg, game.at, true);
    }
  }
  return { state, events };
}

/** Rekordy z całej historii (gry od najstarszej). */
export function computeRecords(games: AchGame[]): RecordsState {
  let s = emptyRecords();
  for (const g of games) s = addRecordsGame(s, g).state;
  return s;
}

/** Podsumowanie gry: dla każdego gracza i rekordu – końcowa wartość i to, co było przed grą. */
export function summarizeEvents(events: RecordEvent[]): RecordEvent[] {
  const out = new Map<string, RecordEvent>();
  for (const e of events) {
    const k = `${e.memberId}:${e.key}`;
    const first = out.get(k);
    // Rekord ligi wygrywa z osobistym; „było” to wartość sprzed gry w tym samym zakresie.
    const keepPrev = first && (first.scope === e.scope || first.scope === "league");
    out.set(k, {
      ...e,
      scope: first?.scope === "league" ? "league" : e.scope,
      prev: keepPrev ? first.prev : e.prev,
    });
  }
  return [...out.values()];
}
