"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isGameState } from "./engine";
import { applyTheme, isTheme, THEME_KEY, type Theme } from "../theme";
import type { GameState } from "./types";

/**
 * Bieżąca gra trzymana w localStorage telefonu, żeby odświeżenie strony
 * lub zablokowanie ekranu nie kasowało wyników. Zakończona gra
 * trafia do bazy ligi.
 */
const GAME_KEY = "dart:game";
const PLAYERS_KEY = "dart:lastPlayerIds";
const SEEN_KEY = "dart:seenFinished";

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string): T | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {}
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T | null = null;
  try {
    value = raw ? (JSON.parse(raw) as T) : null;
  } catch {}
  cache.set(key, { raw, value });
  return value;
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** undefined = jeszcze nie wczytano (renderowanie na serwerze). */
function useStored<T>(key: string): [T | null | undefined, (v: T | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read<T>(key),
    () => undefined,
  );
  const set = useCallback((v: T | null) => write(key, v), [key]);
  return [value, set];
}

export function useStoredGame(): [GameState | null | undefined, (v: GameState | null) => void] {
  const [raw, set] = useStored<unknown>(GAME_KEY);
  // Zapis ze starszej wersji aplikacji traktujemy jak brak gry.
  const game = raw === undefined ? undefined : isGameState(raw) ? raw : null;
  return [game, set as (v: GameState | null) => void];
}
/** Gracze ligi (id) z ostatniej gry na tym telefonie, w kolejności rzucania. */
export const useLastPlayerIds = () => useStored<string[]>(PLAYERS_KEY);

/** Zakończone gry innych, których wynik ten telefon już obejrzał (chowamy baner). */
export function useSeenFinished(): [string[], (id: string) => void] {
  const [raw, set] = useStored<string[]>(SEEN_KEY);
  const seen = Array.isArray(raw) ? raw : [];
  const add = useCallback(
    (id: string) => {
      const prev = read<string[]>(SEEN_KEY);
      const list = Array.isArray(prev) ? prev : [];
      if (!list.includes(id)) set([id, ...list].slice(0, 20));
    },
    [set],
  );
  return [seen, add];
}

/** Wybrany motyw (domyślnie systemowy). Zmiana od razu przełącza wygląd. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [raw, set] = useStored<Theme>(THEME_KEY);
  const theme = isTheme(raw) ? raw : "system";
  const setTheme = useCallback(
    (t: Theme) => {
      applyTheme(t);
      set(t);
    },
    [set],
  );
  return [theme, setTheme];
}
