/** Zakończona gra (z bazy ligi) z klasyfikacją. */
export interface GameRecord {
  id: string;
  finishedAt: string;
  target: number;
  /** Gracze z miejscami, od pierwszego. */
  results: { id?: string; name: string; place: number }[];
}

export interface RankingRow {
  id?: string;
  name: string;
  games: number;
  wins: number;
  /** Średnie miejsce (1 = najlepiej). */
  avgPlace: number;
  /**
   * Zmiana pozycji po ostatniej grze: dodatnia = awans o tyle miejsc,
   * "new" = gracz pojawił się w rankingu dopiero teraz.
   */
  trend?: number | "new";
}

export const RANKING_GAMES = 10;

/**
 * Ranking z ostatnich `lastGames` gier (gry solo pomijamy).
 * Kolejność: najlepsze średnie miejsce, potem więcej wygranych, potem więcej gier.
 * Gracze rozpoznawani po id (z bazy) albo po imieniu (bez względu na wielkość liter).
 */
export function ranking(history: GameRecord[], lastGames = RANKING_GAMES): RankingRow[] {
  const rows = new Map<string, { id?: string; name: string; games: number; wins: number; places: number }>();
  for (const game of history.filter((g) => g.results.length > 1).slice(0, lastGames)) {
    for (const { id, name, place } of game.results) {
      const key = id ?? name.trim().toLowerCase();
      const row = rows.get(key) ?? { id, name, games: 0, wins: 0, places: 0 };
      row.games += 1;
      row.places += place;
      if (place === 1) row.wins += 1;
      rows.set(key, row);
    }
  }
  return [...rows.values()]
    .map((r) => ({ id: r.id, name: r.name, games: r.games, wins: r.wins, avgPlace: r.places / r.games }))
    .sort((a, b) => a.avgPlace - b.avgPlace || b.wins - a.wins || b.games - a.games);
}

/**
 * Ranking z ostatnich gier wraz ze zmianą pozycji względem rankingu
 * sprzed ostatniej gry. `history` może mieć o jedną grę więcej niż
 * `lastGames` (wtedy porównanie obejmuje ten sam rozmiar okna).
 */
export function rankingWithTrend(history: GameRecord[], lastGames = RANKING_GAMES): RankingRow[] {
  const valid = history.filter((g) => g.results.length > 1);
  const now = ranking(valid, lastGames);
  if (valid.length < 2) return now;
  const key = (r: RankingRow) => r.id ?? r.name.trim().toLowerCase();
  const before = ranking(valid.slice(1), lastGames).map(key);
  return now.map((row, i) => {
    const was = before.indexOf(key(row));
    return { ...row, trend: was < 0 ? "new" : was - i };
  });
}
