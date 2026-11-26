"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { addGame, emptyProgress, newlyUnlocked, type Achievement, type AchGame, type AchProgress } from "@/lib/game/achievements";
import { gameEnd, isGameOver, standings } from "@/lib/game/engine";
import { addRecordsGame, emptyRecords, type RecordEvent, type RecordsState } from "@/lib/game/records";
import type { GameState } from "@/lib/game/types";

type Progress = Record<string, AchProgress>;
type League = { members: Progress; records: RecordsState };

/** Postęp sprzed trwającej gry nie zmienia się w trakcie, więc pobieramy go raz na grę. */
const beforeGame = new Map<string, Promise<League>>();

function load(exclude: string | null): Promise<League> {
  const fetchIt = () =>
    api<Partial<League>>(`/api/achievements${exclude ? `?exclude=${encodeURIComponent(exclude)}` : ""}`).then(
      (r) => ({ members: r.members ?? {}, records: r.records ?? emptyRecords() }),
    );
  if (!exclude) return fetchIt();
  let p = beforeGame.get(exclude);
  if (!p) {
    p = fetchIt();
    beforeGame.set(exclude, p);
    p.catch(() => beforeGame.delete(exclude));
  }
  return p;
}

/**
 * Osiągnięcia i rekordy graczy ligi. `exclude` = id trwającej gry: dostajemy stan sprzed niej.
 * null, dopóki się nie wczytają (albo gdy nie ma połączenia – wtedy po prostu ich nie pokazujemy).
 */
function useLeagueData(exclude: string | null, enabled = true): League | null {
  const [data, setData] = useState<{ key: string; value: League } | null>(null);
  const key = exclude ?? "";
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    load(exclude)
      .then((value) => alive && setData({ key, value }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [exclude, key, enabled]);
  return data?.key === key ? data.value : null;
}

/** Osiągnięcia graczy ligi (zob. useLeagueData). */
export function useLeagueAchievements(exclude: string | null, enabled = true): Progress | null {
  return useLeagueData(exclude, enabled)?.members ?? null;
}

/** Rekordy ligi i graczy z całej historii. */
export function useLeagueRecords(): RecordsState | null {
  return useLeagueData(null)?.records ?? null;
}

/** Nowe rekordy pobite w tej grze, w kolejności serii (null = jeszcze nie wiadomo). */
export function useGameRecords(game: GameState | null | undefined): RecordEvent[] | null {
  const id = game?.id ?? null;
  const base = useLeagueData(id, !!id && (game?.players.length ?? 0) > 1)?.records ?? null;
  return useMemo(() => (game && base ? addRecordsGame(base, toAchGame(game)).events : null), [game, base]);
}

/** Gra z telefonu w postaci do liczenia osiągnięć. */
export function toAchGame(game: GameState): AchGame {
  const over = isGameOver(game);
  return {
    id: game.id ?? "",
    target: game.settings.target,
    players: game.players.map((p) => p.id),
    turns: game.turns,
    at: gameEnd(game) ?? Date.now(),
    ...(over ? { places: Object.fromEntries(standings(game).map((s) => [s.player.id, s.place])) } : {}),
  };
}

/** Osiągnięcia zdobyte w tej grze przez każdego gracza (null = jeszcze nie wiadomo). */
export function useGameAchievements(game: GameState | null | undefined): Record<string, Achievement[]> | null {
  const id = game?.id ?? null;
  const base = useLeagueAchievements(id, !!id && (game?.players.length ?? 0) > 1);
  return useMemo(() => {
    if (!game || !base) return null;
    const g = toAchGame(game);
    const out: Record<string, Achievement[]> = {};
    for (const p of g.players) {
      const before = base[p];
      const after = addGame(before ?? emptyProgress(), p, g);
      out[p] = newlyUnlocked(before, after);
    }
    return out;
  }, [game, base]);
}

