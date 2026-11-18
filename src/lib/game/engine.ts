import type { GameState, Player, PlayerId, Turn } from "./types";

export const MAX_SCORE_PER_TURN = 180;
export const DEFAULT_TARGET = 101;

export function createGame(
  players: Player[],
  target: number = DEFAULT_TARGET,
): GameState {
  if (players.length === 0) throw new Error("Dodaj co najmniej jednego gracza.");
  if (!Number.isInteger(target) || target <= 0)
    throw new Error("Cel musi być dodatnią liczbą całkowitą.");
  return { settings: { target }, players, turns: [], winnerId: null };
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

/** Gracz, który rzuca teraz (null po zakończeniu gry). */
export function currentPlayer(state: GameState): Player | null {
  if (state.winnerId) return null;
  return state.players[state.turns.length % state.players.length];
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

  const remaining = remainingFor(state, player.id);
  const turn: Turn = { playerId: player.id, scored: score, bust: score > remaining };

  return {
    ...state,
    turns: [...state.turns, turn],
    winnerId: score === remaining ? player.id : null,
  };
}

/** Cofa ostatnią serię (np. po pomyłce przy wpisywaniu). */
export function undoLastTurn(state: GameState): GameState {
  if (state.turns.length === 0) return state;
  return { ...state, turns: state.turns.slice(0, -1), winnerId: null };
}
