import type { Turn } from "./types";

/**
 * Statystyki całej ligi liczone z zapisanych gier. Bez zależności od bazy,
 * żeby dało się je łatwo testować.
 */

export interface StatsGame {
  id: string;
  finishedAt: string;
  target: number;
  turns: Turn[];
  /** Miejsca graczy (gry z co najmniej dwoma graczami). */
  results: { memberId: string; place: number }[];
  /** Pierwsza i ostatnia rzutka (gry zapisane przed pomiarem czasu: null). */
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface StatsMember {
  id: string;
  name: string;
  color: number;
  /** Ikonka zamiast koloru (lib/looks). */
  icon?: string | null;
}

export interface PlayerSummary extends StatsMember {
  games: number;
  wins: number;
  series: number;
  /** Średnio punktów na serię (przekroczenia liczą się jako 0). */
  avgPerSeries: number;
  bestSeries: number;
  busts: number;
}

/** Rekord ligi: kto, ile i kiedy. */
export interface LeagueRecord {
  memberId: string;
  value: number;
  /** Np. cel gry przy najszybszej wygranej. */
  target?: number;
  at?: string;
}

export interface LeagueStats {
  games: number;
  series: number;
  avgPerSeries: number;
  busts: number;
  players: PlayerSummary[];
  records: {
    bestSeries?: LeagueRecord;
    /** Najmniej serii do wygranej. */
    fastestWin?: LeagueRecord;
    mostWins?: LeagueRecord;
    /** Najlepsza średnia na serię (gracze z co najmniej MIN_SERIES seriami). */
    bestAverage?: LeagueRecord;
  };
  /** Trafienia całej ligi i każdego gracza (rzutki wpisywane osobno). */
  hits: Record<string, number>;
  hitsBy: Record<string, Record<string, number>>;
  hitGames: number;
  hitGamesBy: Record<string, number>;
  /** Czas gry w ms (tylko gry z zapisanym czasem). */
  durations: { games: number; avgMs: number; shortestMs: number; longestMs: number } | null;
  /** Kiedy grano (do wykresu dni tygodnia w strefie telefonu). */
  playedAt: string[];
}

export const MIN_SERIES = 10;
/** Dłuższe „gry” to raczej zapomniany telefon niż prawdziwa rozgrywka. */
const MAX_DURATION_MS = 6 * 60 * 60 * 1000;

export function computeLeagueStats(games: StatsGame[], members: StatsMember[]): LeagueStats {
  const valid = games.filter((g) => g.results.length > 1);
  const byId = new Map(members.map((m) => [m.id, m]));
  const players = new Map<string, PlayerSummary & { points: number }>();
  const player = (id: string) => {
    let p = players.get(id);
    if (!p) {
      const m = byId.get(id) ?? { id, name: "Usunięty gracz", color: 0 };
      p = { ...m, games: 0, wins: 0, series: 0, avgPerSeries: 0, bestSeries: 0, busts: 0, points: 0 };
      players.set(id, p);
    }
    return p;
  };

  const hits: Record<string, number> = {};
  const hitsBy: Record<string, Record<string, number>> = {};
  let hitGames = 0;
  const hitGamesBy: Record<string, number> = {};
  let series = 0;
  let points = 0;
  let busts = 0;
  let bestSeries: LeagueRecord | undefined;
  let fastestWin: LeagueRecord | undefined;
  const durations: number[] = [];

  // Od najstarszej, żeby przy remisie rekord należał do tego, kto ustanowił go pierwszy.
  const chronological = [...valid].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  for (const g of chronological) {
    const inGame = new Set(g.results.map((r) => r.memberId));
    const rounds = new Map<string, number>();
    let counted = false;
    const hitters = new Set<string>();
    for (const t of g.turns ?? []) {
      if (!inGame.has(t.playerId)) continue;
      const p = player(t.playerId);
      rounds.set(t.playerId, (rounds.get(t.playerId) ?? 0) + 1);
      p.series++;
      series++;
      if (t.bust) {
        p.busts++;
        busts++;
      } else {
        p.points += t.scored;
        points += t.scored;
        p.bestSeries = Math.max(p.bestSeries, t.scored);
        if (!bestSeries || t.scored > bestSeries.value)
          bestSeries = { memberId: t.playerId, value: t.scored, at: g.finishedAt };
      }
      for (const f of t.fields ?? []) {
        hits[f] = (hits[f] ?? 0) + 1;
        const mine = (hitsBy[t.playerId] ??= {});
        mine[f] = (mine[f] ?? 0) + 1;
        counted = true;
        hitters.add(t.playerId);
      }
    }
    if (counted) hitGames++;
    for (const id of hitters) hitGamesBy[id] = (hitGamesBy[id] ?? 0) + 1;

    for (const r of g.results) {
      const p = player(r.memberId);
      p.games++;
      if (r.place === 1) {
        p.wins++;
        const n = rounds.get(r.memberId) ?? 0;
        // Wygrana po „Zakończ grę” bez trafienia równo nie jest rekordem szybkości.
        const reached = finishedExactly(g, r.memberId);
        if (n > 0 && reached && (!fastestWin || n < fastestWin.value))
          fastestWin = { memberId: r.memberId, value: n, target: g.target, at: g.finishedAt };
      }
    }

    if (g.startedAt && g.endedAt) {
      const ms = Date.parse(g.endedAt) - Date.parse(g.startedAt);
      if (ms > 0 && ms <= MAX_DURATION_MS) durations.push(ms);
    }
  }

  const list: PlayerSummary[] = [...players.values()]
    .map(({ points: pts, ...p }) => ({ ...p, avgPerSeries: p.series ? pts / p.series : 0 }))
    .sort((a, b) => b.wins - a.wins || b.avgPerSeries - a.avgPerSeries || b.games - a.games);

  const mostWins = list.find((p) => p.wins > 0);
  const bestAvg = list
    .filter((p) => p.series >= MIN_SERIES)
    .sort((a, b) => b.avgPerSeries - a.avgPerSeries)[0];

  return {
    games: valid.length,
    series,
    avgPerSeries: series ? points / series : 0,
    busts,
    players: list,
    records: {
      bestSeries,
      fastestWin,
      mostWins: mostWins && { memberId: mostWins.id, value: mostWins.wins },
      bestAverage: bestAvg && { memberId: bestAvg.id, value: bestAvg.avgPerSeries },
    },
    hits,
    hitsBy,
    hitGames,
    hitGamesBy,
    durations: durations.length
      ? {
          games: durations.length,
          avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
          shortestMs: Math.min(...durations),
          longestMs: Math.max(...durations),
        }
      : null,
    playedAt: valid.map((g) => g.finishedAt),
  };
}

/** Czy gracz doszedł równo do celu (a nie dostał miejsca po „Zakończ grę”). */
function finishedExactly(g: StatsGame, memberId: string) {
  let sum = 0;
  for (const t of g.turns ?? []) if (t.playerId === memberId && !t.bust) sum += t.scored;
  return sum === g.target;
}

/** Liczba gier w każdym dniu tygodnia (0 = poniedziałek) w strefie urządzenia. */
export function gamesByWeekday(playedAt: string[]): number[] {
  const days = [0, 0, 0, 0, 0, 0, 0];
  for (const iso of playedAt) days[(new Date(iso).getDay() + 6) % 7]++;
  return days;
}

/** Czas gry do wyświetlenia, np. „12 min”, „1 h 5 min”, „45 s”. */
export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}
