import { standings } from "./engine";
import type { GameState } from "./types";

/** Zakończona gra zapisana w historii. */
export interface GameRecord {
  id: string;
  finishedAt: string;
  target: number;
  /** Gracze z miejscami, od pierwszego. */
  results: { name: string; place: number }[];
}

export interface RankingRow {
  name: string;
  games: number;
  wins: number;
  /** Średnie miejsce (1 = najlepiej). */
  avgPlace: number;
}

export const HISTORY_LIMIT = 50;
export const RANKING_GAMES = 10;

export function toRecord(game: GameState, finishedAt = new Date()): GameRecord {
  return {
    id: game.id ?? finishedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    target: game.settings.target,
    results: standings(game).map((s) => ({ name: s.player.name, place: s.place })),
  };
}

/** Dodaje grę na początek historii (bez duplikatów, najwyżej HISTORY_LIMIT). */
export function addRecord(history: GameRecord[], record: GameRecord): GameRecord[] {
  return [record, ...history.filter((r) => r.id !== record.id)].slice(0, HISTORY_LIMIT);
}

export function removeRecord(history: GameRecord[], id: string | undefined): GameRecord[] {
  return id ? history.filter((r) => r.id !== id) : history;
}

/**
 * Ranking z ostatnich `lastGames` gier (gry solo pomijamy).
 * Kolejność: najlepsze średnie miejsce, potem więcej wygranych, potem więcej gier.
 * Gracze rozpoznawani po imieniu (bez względu na wielkość liter).
 */
export function ranking(history: GameRecord[], lastGames = RANKING_GAMES): RankingRow[] {
  const rows = new Map<string, { name: string; games: number; wins: number; places: number }>();
  for (const game of history.filter((g) => g.results.length > 1).slice(0, lastGames)) {
    for (const { name, place } of game.results) {
      const key = name.trim().toLowerCase();
      const row = rows.get(key) ?? { name, games: 0, wins: 0, places: 0 };
      row.games += 1;
      row.places += place;
      if (place === 1) row.wins += 1;
      rows.set(key, row);
    }
  }
  return [...rows.values()]
    .map((r) => ({ name: r.name, games: r.games, wins: r.wins, avgPlace: r.places / r.games }))
    .sort((a, b) => a.avgPlace - b.avgPlace || b.wins - a.wins || b.games - a.games);
}
