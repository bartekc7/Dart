"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isGameState } from "./engine";
import type { GameRecord } from "./history";
import type { GameState } from "./types";

/**
 * Bieżąca gra trzymana w localStorage telefonu, żeby odświeżenie strony
 * lub zablokowanie ekranu nie kasowało wyników. W kroku 3 obok tego
 * dojdzie zapis do bazy.
 */
const GAME_KEY = "dart:game";
const PLAYERS_KEY = "dart:lastPlayers";
const HISTORY_KEY = "dart:history";

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
export const useLastPlayerNames = () => useStored<string[]>(PLAYERS_KEY);

/** Zakończone gry na tym telefonie, najnowsze pierwsze. */
export function useHistory(): [GameRecord[] | undefined, (v: GameRecord[]) => void] {
  const [raw, set] = useStored<GameRecord[]>(HISTORY_KEY);
  const history = raw === undefined ? undefined : Array.isArray(raw) ? raw : [];
  return [history, set as (v: GameRecord[]) => void];
}
