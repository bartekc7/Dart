import type { GameState, Placement, Player, PlayerId, Turn } from "./types";

export const MAX_SCORE_PER_TURN = 180;
export const DEFAULT_TARGET = 101;

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/*
 * Zasady:
 * - gramy „do równego”: kto trafi dokładnie w cel, kończy i zajmuje kolejne wolne miejsce,
 * - seria przekraczająca cel się nie liczy,
 * - po zakończeniu gracza reszta gra dalej, a ukończeni są pomijani w kolejce,
 * - gra kończy się, gdy został jeden gracz (zajmuje ostatnie miejsce)
 *   albo, przy grze solo, gdy jedyny gracz trafi w cel.
 */

export function createGame(players: Player[], target: number = DEFAULT_TARGET): GameState {
  if (players.length === 0) throw new Error("Dodaj co najmniej jednego gracza.");
  if (!Number.isInteger(target) || target <= 0)
    throw new Error("Cel musi być dodatnią liczbą całkowitą.");
  return { id: newId(), settings: { target }, players, turns: [] };
}

/** Punkty zdobyte przez gracza (serie z przekroczeniem się nie liczą). */
export function scoreOf(state: GameState, playerId: PlayerId): number {
  return state.turns
    .filter((t) => t.playerId === playerId && !t.bust)
    .reduce((sum, t) => sum + t.scored, 0);
}

/** Ile graczowi zostało do równego celu. */
export function remainingFor(state: GameState, playerId: PlayerId): number {
  return state.settings.target - scoreOf(state, playerId);
}

/** Gracze, którzy trafili równo w cel, w kolejności kończenia. */
export function finishOrder(state: GameState): PlayerId[] {
  const order: PlayerId[] = [];
  const scored = new Map<PlayerId, number>();
  for (const t of state.turns) {
    if (t.bust) continue;
    const total = (scored.get(t.playerId) ?? 0) + t.scored;
    scored.set(t.playerId, total);
    if (total === state.settings.target) order.push(t.playerId);
  }
  return order;
}

/** Miejsce gracza (1, 2, …) albo null, jeśli jeszcze gra. */
export function placeOf(state: GameState, playerId: PlayerId): number | null {
  const i = finishOrder(state).indexOf(playerId);
  return i === -1 ? null : i + 1;
}

/** Gracze, którzy jeszcze rzucają, w kolejności rzucania. */
export function activePlayers(state: GameState): Player[] {
  const done = new Set(finishOrder(state));
  return state.players.filter((p) => !done.has(p.id));
}

export function isGameOver(state: GameState): boolean {
  if (state.endedEarly) return true;
  const active = activePlayers(state).length;
  return state.players.length === 1 ? active === 0 : active <= 1;
}

/** Gracz, który rzuca teraz (null po zakończeniu gry). */
export function currentPlayer(state: GameState): Player | null {
  if (isGameOver(state)) return null;
  const done = new Set(finishOrder(state));
  const last = state.turns.at(-1);
  const start = last ? state.players.findIndex((p) => p.id === last.playerId) + 1 : 0;
  for (let k = 0; k < state.players.length; k++) {
    const p = state.players[(start + k) % state.players.length];
    if (!done.has(p.id)) return p;
  }
  return null;
}

export function isValidTurnScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= MAX_SCORE_PER_TURN;
}

export const DARTS_PER_TURN = 3;

/**
 * Czy tyle punktów da się zdobyć jedną rzutką: 0 (pudło), pole 1–20,
 * podwójne (do 40), potrójne (do 60), 25 i 50 (środek).
 */
export function isValidDart(v: number): boolean {
  if (!Number.isInteger(v) || v < 0) return false;
  return v <= 20 || v === 25 || v === 50 || (v <= 40 && v % 2 === 0) || (v <= 60 && v % 3 === 0);
}

/** Rzutki pojedynczej serii: 1–3 poprawne wartości. */
export function isValidDarts(darts: number[]): boolean {
  return darts.length >= 1 && darts.length <= DARTS_PER_TURN && darts.every(isValidDart);
}

/** „20 + 60 + 5” do pokazania serii wpisanej rzutka po rzutce. */
export function formatDarts(darts: number[]): string {
  return darts.join(" + ");
}

/**
 * Zapisuje serię bieżącego gracza i zwraca nowy stan (bez mutacji).
 * `darts` (opcjonalnie) to punkty z kolejnych rzutek; ich suma musi
 * równać się `score`. Przekroczenie liczymy zawsze po sumie serii.
 */
export function applyTurn(
  state: GameState,
  score: number,
  darts?: number[],
  fields?: string[],
  time: TurnTime = {},
): GameState {
  const player = currentPlayer(state);
  if (!player) throw new Error("Gra jest już zakończona.");
  if (!isValidTurnScore(score))
    throw new Error(`Wynik serii musi być liczbą od 0 do ${MAX_SCORE_PER_TURN}.`);
  if (darts !== undefined && (!isValidDarts(darts) || darts.reduce((a, b) => a + b, 0) !== score))
    throw new Error("Nieprawidłowe rzutki w serii.");

  const turn: Turn = {
    playerId: player.id,
    scored: score,
    bust: score > remainingFor(state, player.id),
    ...(darts ? { darts: [...darts] } : {}),
    // Pola zapisujemy tylko, gdy zgadzają się z punktami rzutek (inaczej je pomijamy).
    ...(darts && fields && fields.length === darts.length && fields.every((f, i) => fieldValue(f) === darts[i])
      ? { fields: [...fields] }
      : {}),
  };
  // Czas serii: domyślnie teraz; null = nie zapisujemy (np. serwer odtwarza starą grę bez czasów).
  const at = time.at === undefined ? Date.now() : time.at;
  if (at === null || !isTime(at)) return { ...state, turns: [...state.turns, turn] };
  turn.at = at;
  // Początek gry: pierwsza rzutka (w trybie rzutek wcześniej niż zapis pierwszej serii).
  const startedAt =
    state.startedAt ?? (state.turns.length === 0 ? (isTime(time.startedAt) && time.startedAt <= at ? time.startedAt : at) : undefined);
  return { ...state, turns: [...state.turns, turn], ...(startedAt !== undefined ? { startedAt } : {}) };
}

/** Czas zapisu serii i (przy pierwszej serii) pierwszej rzutki gry. */
export interface TurnTime {
  /** Kiedy zapisano serię; brak = teraz, null = bez czasu. */
  at?: number | null;
  /** Kiedy rzucono pierwszą rzutkę gry (tylko przy pierwszej serii). */
  startedAt?: number;
}

function isTime(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0;
}

/** Czy można zakończyć grę teraz: ktoś już skończył, a gra jeszcze trwa. */
export function canEndEarly(state: GameState): boolean {
  return !isGameOver(state) && finishOrder(state).length > 0;
}

/** Kończy grę od razu; pozostali gracze dostają miejsca według tego, ile im zostało. */
export function endGame(state: GameState): GameState {
  if (!canEndEarly(state)) throw new Error("Grę można zakończyć, gdy ktoś już skończył.");
  return { ...state, endedEarly: true };
}

/**
 * Cofa ostatnią serię (np. po pomyłce przy wpisywaniu). Po „Zakończ grę”
 * najpierw cofa samo zakończenie.
 */
export function undoLastTurn(state: GameState): GameState {
  if (state.endedEarly) {
    const { endedEarly: _, ...rest } = state;
    return rest;
  }
  if (state.turns.length === 0) return state;
  const turns = state.turns.slice(0, -1);
  if (turns.length > 0) return { ...state, turns };
  // Bez serii gra jeszcze się nie zaczęła.
  const { startedAt: _, ...rest } = state;
  return { ...rest, turns };
}

/** Ostatnia seria gracza (do pokazania przy wyniku), albo null. */
export function lastTurnOf(state: GameState, playerId: PlayerId): Turn | null {
  for (let i = state.turns.length - 1; i >= 0; i--) {
    if (state.turns[i].playerId === playerId) return state.turns[i];
  }
  return null;
}

/**
 * Klasyfikacja: najpierw ukończeni w kolejności kończenia,
 * potem pozostali od najmniejszej liczby punktów do końca.
 */
export function standings(state: GameState): Placement[] {
  const order = finishOrder(state);
  const rounds = (id: PlayerId) => state.turns.filter((t) => t.playerId === id).length;
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const finished = order.map((id) => byId.get(id)!);
  const rest = state.players
    .filter((p) => !order.includes(p.id))
    .sort((a, b) => remainingFor(state, a.id) - remainingFor(state, b.id));
  return [...finished, ...rest].map((player, i) => ({
    player,
    place: i + 1,
    rounds: rounds(player.id),
    remaining: remainingFor(state, player.id),
    finished: i < finished.length,
  }));
}

/**
 * Nowa gra z tymi samymi graczami i celem. Zaczyna kolejny gracz
 * (pierwszy przechodzi na koniec), żeby nie zaczynał zawsze ten sam.
 */
export function rematch(state: GameState): GameState {
  const [first, ...rest] = state.players;
  return createGame(first ? [...rest, first] : [], state.settings.target);
}

/** Czy zapisany stan pasuje do obecnego formatu (stare zapisy pomijamy). */
export function isGameState(value: unknown): value is GameState {
  const g = value as GameState | null;
  return (
    !!g &&
    typeof g.settings?.target === "number" &&
    Array.isArray(g.players) &&
    Array.isArray(g.turns) &&
    !("winnerId" in g)
  );
}

export interface PlayerStats {
  /** Liczba rzuconych serii (z przekroczeniami). */
  series: number;
  /** Zdobyte punkty (bez serii, które się nie liczyły). */
  points: number;
  /** Średnio punktów na serię (0, gdy brak serii). */
  average: number;
  /** Najlepsza zaliczona seria. */
  best: number;
  /** Ile serii przekroczyło cel. */
  busts: number;
}

export function playerStats(state: GameState, playerId: PlayerId): PlayerStats {
  const turns = state.turns.filter((t) => t.playerId === playerId);
  const counted = turns.filter((t) => !t.bust);
  const points = counted.reduce((sum, t) => sum + t.scored, 0);
  return {
    series: turns.length,
    points,
    average: turns.length ? points / turns.length : 0,
    best: counted.reduce((m, t) => Math.max(m, t.scored), 0),
    busts: turns.length - counted.length,
  };
}

/** Mnożnik pola: pojedyncze, podwójne, potrójne. */
export type Mult = 1 | 2 | 3;

/** Zapis rzutki o danej wartości, np. 16 → „16”, 40 → „D20”, 57 → „T19”, 50 → „D25”. */
export function dartName(v: number): string {
  if (v <= 20 || v === 25) return String(v);
  if (v === 50) return "D25";
  if (v <= 40 && v % 2 === 0) return `D${v / 2}`;
  return `T${v / 3}`;
}

/** Wartość rzutki z mnożnikiem; null, gdy takiego pola nie ma (np. T25, D21). */
export function dartValue(field: number, mult: Mult): number | null {
  if (mult === 1) return isValidDart(field) ? field : null;
  if (field >= 1 && field <= 20) return field * mult;
  if (field === 25 && mult === 2) return 50;
  return null;
}

/** Punkty pola zapisanego jak „T20”, „D8”, „20”, „25”, „D25”, „0”; null dla błędnego zapisu. */
export function fieldValue(key: string): number | null {
  const m = /^([DT]?)(\d{1,2})$/.exec(key);
  if (!m) return null;
  const field = Number(m[2]);
  const mult: Mult = m[1] === "T" ? 3 : m[1] === "D" ? 2 : 1;
  if (mult === 1 && field > 20 && field !== 25) return null;
  return dartValue(field, mult);
}

/*
 * Podpowiedź zakończenia. Gramy „do równego” bez wymogu double,
 * więc kończyć można dowolnym polem. Szukamy najmniejszej liczby rzutek,
 * a przy remisie pól najłatwiejszych do trafienia (duże pojedyncze,
 * potem double/triple, na końcu środek tarczy).
 */

interface Throw {
  value: number;
  name: string;
  cost: number;
}

const THROWS: Throw[] = (() => {
  const list: Throw[] = [];
  for (let f = 20; f >= 1; f--) {
    // Double/triple najchętniej w okolicy „dwudziestki”, gdzie i tak się celuje.
    const near = (20 - f) * 0.05;
    list.push({ value: f * 3, name: `T${f}`, cost: 2 + near });
    list.push({ value: f * 2, name: `D${f}`, cost: 2 + near });
    list.push({ value: f, name: String(f), cost: 1 + near / 10 });
  }
  list.push({ value: 25, name: "25", cost: 2.5 }, { value: 50, name: "D25", cost: 3 });
  return list;
})();

type Plan = { names: string[]; cost: number } | null;
const plans = new Map<string, Plan>();

function plan(left: number, darts: number): Plan {
  if (left <= 0 || darts <= 0) return null;
  const key = `${left}/${darts}`;
  const known = plans.get(key);
  if (known !== undefined) return known;
  let best: Plan = null;
  // Najpierw jedna rzutka; więcej rzutek tylko, gdy jedną się nie da.
  for (const t of THROWS) {
    if (t.value === left && (!best || t.cost < best.cost)) best = { names: [t.name], cost: t.cost };
  }
  if (!best && darts > 1) {
    for (const t of THROWS) {
      if (t.value >= left) continue;
      const rest = plan(left - t.value, darts - 1);
      if (!rest) continue;
      const len = rest.names.length + 1;
      const cost = t.cost + rest.cost;
      if (!best || len < best.names.length || (len === best.names.length && cost < best.cost))
        best = { names: [t.name, ...rest.names], cost };
    }
  }
  plans.set(key, best);
  return best;
}

/**
 * Jak skończyć równo, mając `darts` rzutek (1–3), np. 100 → ["T20", "D20"].
 * null, gdy się nie da (za dużo punktów albo brak rzutek).
 */
export function checkout(left: number, darts: number = DARTS_PER_TURN): string[] | null {
  if (!Number.isInteger(left) || left > 60 * darts) return null;
  const p = plan(left, Math.min(darts, DARTS_PER_TURN));
  // Najpierw najwyższe pole – tak zwykle się rzuca i czyta.
  return p ? [...p.names].sort((a, b) => (fieldValue(b) ?? 0) - (fieldValue(a) ?? 0)) : null;
}

/** „T20 + D20” do pokazania w podpowiedzi. */
export function formatCheckout(names: string[]): string {
  return names.join(" + ");
}

/*
 * Czas gry: od pierwszej rzutki do ostatniej serii. Czas gracza, który
 * skończył: od pierwszej rzutki do jego serii kończącej.
 */

/** Początek gry (ms) albo null, gdy gra nie ma zapisanych czasów. */
export function gameStart(state: GameState): number | null {
  return state.startedAt ?? state.turns[0]?.at ?? null;
}

/** Ostatnia seria gry (ms) albo null. */
export function gameEnd(state: GameState): number | null {
  return state.turns.at(-1)?.at ?? null;
}

/** Czas całej gry w ms (od pierwszej rzutki do ostatniej serii) albo null. */
export function gameDuration(state: GameState): number | null {
  const start = gameStart(state);
  const end = gameEnd(state);
  return start !== null && end !== null && end >= start ? end - start : null;
}

/** Kiedy gracz trafił równo (ms) albo null, gdy jeszcze gra lub brak czasu. */
export function finishedAt(state: GameState, playerId: PlayerId): number | null {
  let total = 0;
  for (const t of state.turns) {
    if (t.playerId !== playerId || t.bust) continue;
    total += t.scored;
    if (total === state.settings.target) return t.at ?? null;
  }
  return null;
}

/** Po jakim czasie gracz skończył (ms od pierwszej rzutki) albo null. */
export function finishTime(state: GameState, playerId: PlayerId): number | null {
  const start = gameStart(state);
  const end = finishedAt(state, playerId);
  return start !== null && end !== null && end >= start ? end - start : null;
}

/** „4:07”, „12:30”, „1:05:09” – czas w minutach i sekundach (z godzinami, gdy trzeba). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
