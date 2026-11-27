/**
 * Forma gracza: czy w ostatnich grach rzuca lepiej, czy gorzej niż wcześniej.
 * Liczona z historii gier (bez osobnej tabeli). Miara: średnia na serię
 * w każdej grze; porównujemy najnowszą połowę ostatnich 10 gier ze starszą.
 * Bez Reacta i bez bazy.
 */
import type { Turn } from "./types";

/** Ile ostatnich gier bierzemy pod uwagę. */
export const FORM_GAMES = 10;
/** Od ilu gier pokazujemy formę. */
export const FORM_MIN_GAMES = 6;
/** Zmiana średniej (względem starszych gier), od której forma rośnie albo spada. */
export const FORM_THRESHOLD = 0.1;

/** Jedna gra gracza do liczenia formy. */
export interface FormGame {
  /** Kiedy skończona (ms) – do ustawienia gier w kolejności. */
  at: number;
  /** Średnio punktów na serię w tej grze (przekroczenia = 0). */
  avg: number;
  won: boolean;
  /** Gra 1 na 1 (na wykresie pusta kropka). */
  duel?: boolean;
}

export interface FormHalf {
  games: number;
  /** Średnia ze średnich gier (każda gra waży tyle samo). */
  avg: number;
  wins: number;
}

export type FormDirection = "up" | "down" | "flat";

export type PlayerForm =
  | { ready: false; games: number; needed: number }
  | {
      ready: true;
      direction: FormDirection;
      /** Zmiana średniej na serię (nowsze − starsze). */
      delta: number;
      /** Zmiana względna (0,18 = +18%), null gdy starsze gry miały średnią 0. */
      change: number | null;
      older: FormHalf;
      newer: FormHalf;
      /**
       * Punkty wykresu od najstarszej gry. Bez dat, rywali i wyników –
       * gry 1 na 1 są prywatne, a karta gracza jest widoczna dla całej ligi.
       */
      points: { avg: number; duel: boolean }[];
    };

/** Średnia na serię gracza w jednej grze, null gdy nie rzucał. */
export function gameAverage(turns: Turn[], playerId: string): number | null {
  let series = 0;
  let points = 0;
  for (const t of turns) {
    if (t.playerId !== playerId) continue;
    series++;
    if (!t.bust) points += t.scored;
  }
  return series ? points / series : null;
}

function half(games: FormGame[]): FormHalf {
  return {
    games: games.length,
    avg: games.reduce((s, g) => s + g.avg, 0) / games.length,
    wins: games.filter((g) => g.won).length,
  };
}

/** Forma z gier gracza (w dowolnej kolejności): ostatnie 10, nowsza połowa vs starsza. */
export function computeForm(all: FormGame[]): PlayerForm {
  const games = [...all].sort((a, b) => a.at - b.at).slice(-FORM_GAMES);
  if (games.length < FORM_MIN_GAMES) return { ready: false, games: games.length, needed: FORM_MIN_GAMES };
  const split = Math.ceil(games.length / 2);
  const older = half(games.slice(0, split));
  const newer = half(games.slice(split));
  const delta = newer.avg - older.avg;
  const change = older.avg > 0 ? delta / older.avg : null;
  let direction: FormDirection = "flat";
  if (change === null) direction = delta > 0 ? "up" : "flat";
  // Mała poprawka na błędy zaokrągleń, żeby równe 10% liczyło się jako zmiana.
  else if (change >= FORM_THRESHOLD - 1e-9) direction = "up";
  else if (change <= -FORM_THRESHOLD + 1e-9) direction = "down";
  return {
    ready: true,
    direction,
    delta,
    change,
    older,
    newer,
    points: games.map((g) => ({ avg: g.avg, duel: !!g.duel })),
  };
}
