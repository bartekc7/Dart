/**
 * Statystyki gier 1 na 1 – osobno od ligi. Liczone z zakończonych gier
 * (stan gry z seriami), bez osobnych tabel. Bez Reacta i bez bazy.
 */
import { gameDuration, isDraw, isGameOver, isLastChance, winnerOf } from "./game/engine";
import { computeForm, gameAverage, type FormGame, type PlayerForm } from "./game/form";
import { addRecordsGame, emptyRecords, type RecordsState } from "./game/records";
import type { AchGame } from "./game/achievements";
import type { GameState } from "./game/types";

/** Zakończona gra 1 na 1. */
export interface FinishedDuel {
  id: string;
  target: number;
  state: GameState;
  /** null = remis (wyrównana runda, obaj skończyli w tej samej rundzie). */
  winnerId: string | null;
  /** Kiedy skończona (ms). */
  endedAt: number;
}

export interface DuelTotals {
  games: number;
  won: number;
  lost: number;
  /** Remisy (tylko w grach z wyrównaną rundą). */
  drawn: number;
  /** Średnio punktów na serię (3 rzutki), z przekroczeniami jako 0. */
  average: number;
}

function myTurns(state: GameState, me: string) {
  return state.turns.filter((t) => t.playerId === me);
}

function averageOf(games: FinishedDuel[], me: string): number {
  let series = 0;
  let points = 0;
  for (const g of games)
    for (const t of myTurns(g.state, me)) {
      series++;
      if (!t.bust) points += t.scored;
    }
  return series ? points / series : 0;
}

export function duelTotals(games: FinishedDuel[], me: string): DuelTotals {
  const won = games.filter((g) => g.winnerId === me).length;
  const drawn = games.filter((g) => !g.winnerId).length;
  return { games: games.length, won, lost: games.length - won - drawn, drawn, average: averageOf(games, me) };
}

/**
 * Gra widziana tylko od strony jednego gracza: jego serie i drugi, „pusty”
 * gracz. Rekordy 1 na 1 są osobiste, więc rywal nie może ich „zabierać”.
 */
export function soloView(state: GameState, me: string, at: number): AchGame {
  const over = isGameOver(state);
  const won = winnerOf(state) === me;
  return {
    id: state.id ?? "",
    target: state.settings.target,
    players: [me, "~rywal"],
    turns: myTurns(state, me),
    at,
    ...(over ? { places: { [me]: won ? 1 : 2, "~rywal": won ? 2 : 1 } } : {}),
    // Remis albo rywal ma jeszcze ostatnią szansę: moje zejście do 0 to nie (jeszcze) wygrana.
    ...(isDraw(state) || isLastChance(state) ? { noWin: true } : {}),
  };
}

/** Moje rekordy 1 na 1 z całej historii (od najstarszej gry). */
export function duelRecords(games: FinishedDuel[], me: string): RecordsState {
  let s = emptyRecords();
  for (const g of [...games].sort((a, b) => a.endedAt - b.endedAt)) s = addRecordsGame(s, soloView(g.state, me, g.endedAt)).state;
  return s;
}

export interface PlayerSide {
  average: number;
  /** Najlepsza zaliczona seria. */
  best: number;
  /** Najmniej serii do wygranej (null = bez wygranej). */
  fastest: number | null;
}

export interface HeadToHead {
  won: number;
  lost: number;
  drawn: number;
  /** Seria wygranych z rzędu na koniec: kto i ile (null, gdy brak gier). */
  streak: { winnerId: string; n: number } | null;
  /** Pierwsza wspólna gra (ms). */
  since: number | null;
  me: PlayerSide;
  rival: PlayerSide;
  /** Średni czas gry (ms) albo null. */
  avgDurationMs: number | null;
  /** Ostatnie gry, najnowsze pierwsze. */
  recent: { id: string; won: boolean; draw: boolean; target: number; at: number; durationMs: number | null }[];
}

function side(games: FinishedDuel[], id: string): PlayerSide {
  let best = 0;
  let fastest: number | null = null;
  for (const g of games) {
    const turns = myTurns(g.state, id);
    for (const t of turns) if (!t.bust) best = Math.max(best, t.scored);
    if (g.winnerId === id) fastest = Math.min(fastest ?? Infinity, turns.length);
  }
  return { average: averageOf(games, id), best, fastest };
}

/** Bilans i porównanie z jednym rywalem (`games` = tylko nasze wspólne gry). */
export function headToHead(games: FinishedDuel[], me: string, rival: string, recentLimit = 10): HeadToHead {
  const sorted = [...games].sort((a, b) => b.endedAt - a.endedAt);
  const won = sorted.filter((g) => g.winnerId === me).length;
  const drawn = sorted.filter((g) => !g.winnerId).length;
  let streak: HeadToHead["streak"] = null;
  for (const g of sorted) {
    if (!g.winnerId) break;
    if (!streak) streak = { winnerId: g.winnerId, n: 1 };
    else if (g.winnerId === streak.winnerId) streak.n++;
    else break;
  }
  const durations = sorted.map((g) => gameDuration(g.state)).filter((d): d is number => d !== null);
  return {
    won,
    lost: sorted.length - won - drawn,
    drawn,
    streak,
    since: sorted.length ? sorted.at(-1)!.endedAt : null,
    me: side(sorted, me),
    rival: side(sorted, rival),
    avgDurationMs: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
    recent: sorted.slice(0, recentLimit).map((g) => ({
      id: g.id,
      won: g.winnerId === me,
      draw: !g.winnerId,
      target: g.target,
      at: g.endedAt,
      durationMs: gameDuration(g.state),
    })),
  };
}

/** Forma z samych gier 1 na 1 (dla gościa spoza ligi; widzi ją tylko on). */
export function duelForm(games: FinishedDuel[], me: string): PlayerForm {
  const form: FormGame[] = [];
  for (const g of games) {
    const avg = gameAverage(g.state.turns, me);
    if (avg !== null) form.push({ at: g.endedAt, avg, won: g.winnerId === me, duel: true });
  }
  return computeForm(form);
}
