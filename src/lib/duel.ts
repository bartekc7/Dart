/**
 * Gry 1 na 1 (towarzyskie, poza ligą). Wspólne typy i proste reguły,
 * których używa serwer i ekran gry. Bez Reacta i bez bazy.
 */
import { PLAYER_COLORS } from "./colors";
import { lookKey } from "./looks";
import type { GameState } from "./game/types";

/** Gracz 1 na 1: nazwa i znak. Gracz z ligi ma te same co w lidze. */
export interface DuelProfile {
  id: string;
  name: string;
  /** Numer koloru (lib/colors); -1 gdy gracz ma ikonkę. */
  color: number;
  icon: string | null;
}

export type DuelStatus = "pending" | "declined" | "cancelled" | "expired" | "active" | "finished";

/** Rzutki wpisane w bieżącej serii, zanim seria się zamknie (podgląd u rywala). */
export interface DuelLive {
  playerId: string;
  darts: number[];
  labels: string[];
}

export interface Duel {
  id: string;
  status: DuelStatus;
  target: number;
  inviter: DuelProfile;
  /** null = zaproszenie linkiem, którego nikt jeszcze nie przyjął. */
  rival: DuelProfile | null;
  /** Kto zaczyna. */
  starterId: string | null;
  /** Kod do linku dla nowej osoby (tylko u zapraszającego). */
  inviteCode: string | null;
  /** Stan gry: gracze w kolejności rzucania, serie. Pusty, dopóki rywal nie przyjmie. */
  state: GameState | null;
  live: DuelLive | null;
  rev: number;
  winnerId: string | null;
  createdAt: string;
  /** Do kiedy ważne jest zaproszenie (ms). */
  expiresAt: number;
  /** Bilans tej pary przed i po tej grze: wygrane każdego z graczy (po id). */
  balance: Record<string, number>;
  /** Rewanż: id nowego zaproszenia po tej grze (gdy ktoś go wysłał). */
  rematchId: string | null;
}

/** Ile ważne jest zaproszenie. */
export const INVITE_TTL_MS = 10 * 60 * 1000;
/** Gra bez ruchu dłużej niż tyle anuluje się sama. */
export const DUEL_STALE_MS = 12 * 60 * 60 * 1000;

/** Cele do wyboru w nowym pojedynku. */
export const DUEL_TARGETS = [101, 201, 301, 501] as const;

export function isDuelTarget(n: unknown): n is number {
  return typeof n === "number" && (DUEL_TARGETS as readonly number[]).includes(n);
}

/**
 * Znaki obu graczy na czas gry. Gdy przypadkiem mają ten sam (np. ten sam
 * kolor w dwóch różnych ligach), rywal dostaje pierwszy inny kolor, żeby
 * dało się ich odróżnić. Profilu w bazie nie zmieniamy.
 */
export function distinctLooks(a: DuelProfile, b: DuelProfile): [DuelProfile, DuelProfile] {
  if (lookKey(a) !== lookKey(b)) return [a, b];
  const taken = a.icon ? -1 : a.color;
  const color = PLAYER_COLORS.findIndex((_, i) => i !== taken);
  return [a, { ...b, color, icon: null }];
}

/** Rewanż: zaczyna ten, kto przegrał. */
export function rematchStarter(state: GameState, winnerId: string | null): string | null {
  return state.players.find((p) => p.id !== winnerId)?.id ?? null;
}

/** Gracze w kolejności rzucania: zaczynający pierwszy. */
export function playOrder<T extends { id: string }>(inviter: T, rival: T, starterId: string): [T, T] {
  return starterId === rival.id ? [rival, inviter] : [inviter, rival];
}
