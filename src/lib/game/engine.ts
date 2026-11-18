import type { GameState, Placement, Player, PlayerId, Turn } from "./types";

export const MAX_SCORE_PER_TURN = 180;
export const DEFAULT_TARGET = 101;

/*
 * Zasady:
 * - gramy „do równego”: kto trafi dokładnie w cel, kończy i zajmuje kolejne wolne miejsce,
 * - seria przekraczająca cel się nie liczy,
 * - po zakończeniu gracza reszta gra dalej, a ukończeni są pomijani w kolejce,
 * - gra kończy się, gdy został jeden gracz (zajmuje ostatnie miejsce)
 *   albo, przy grze solo, gdy jedyny gracz trafi w cel.
 */

export function createGame(
  players: Player[],
  target: number = DEFAULT_TARGET,
): GameState {
  if (players.length === 0) throw new Error("Dodaj co najmniej jednego gracza.");
  if (!Number.isInteger(target) || target <= 0)
    throw new Error("Cel musi być dodatnią liczbą całkowitą.");
  return { settings: { target }, players, turns: [] };
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
  const active = activePlayers(state).length;
  return state.players.length === 1 ? active === 0 : active <= 1;
}

/** Gracz, który rzuca teraz (null po zakończeniu gry). */
export function currentPlayer(state: GameState): Player | null {
  if (isGameOver(state)) return null;
  const done = new Set(finishOrder(state));
  const last = state.turns.at(-1);
  const start = last
    ? state.players.findIndex((p) => p.id === last.playerId) + 1
    : 0;
  for (let k = 0; k < state.players.length; k++) {
    const p = state.players[(start + k) % state.players.length];
    if (!done.has(p.id)) return p;
  }
  return null;
}

export function isValidTurnScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= MAX_SCORE_PER_TURN;
}

/** Zapisuje serię bieżącego gracza i zwraca nowy stan (bez mutacji). */
export function applyTurn(state: GameState, score: number): GameState {
  const player = currentPlayer(state);
  if (!player) throw new Error("Gra jest już zakończona.");
  if (!isValidTurnScore(score))
    throw new Error(`Wynik serii musi być liczbą od 0 do ${MAX_SCORE_PER_TURN}.`);

  const turn: Turn = {
    playerId: player.id,
    scored: score,
    bust: score > remainingFor(state, player.id),
  };
  return { ...state, turns: [...state.turns, turn] };
}

/** Cofa ostatnią serię (np. po pomyłce przy wpisywaniu). */
export function undoLastTurn(state: GameState): GameState {
  if (state.turns.length === 0) return state;
  return { ...state, turns: state.turns.slice(0, -1) };
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

/** Nowa gra z tymi samymi graczami i celem. */
export function rematch(state: GameState): GameState {
  return createGame(state.players, state.settings.target);
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
