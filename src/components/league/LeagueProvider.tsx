"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { playerColor } from "@/lib/colors";
import type { RankingRow } from "@/lib/game/history";
import type { EntryMode } from "@/lib/game/types";
import type { Me, Member, MyGame } from "@/lib/server/league";

export interface LeagueData {
  me: Me | null;
  members: Member[];
  /** Usunięci gracze z grami: wyszarzeni, nie do wyboru w nowej grze. */
  inactive: Member[];
  ranking: { rows: RankingRow[]; games: number };
  myGames: MyGame[];
}

type State =
  | { status: "loading" }
  | { status: "ready"; data: LeagueData }
  | { status: "error"; message: string; noDatabase: boolean };

const LeagueContext = createContext<{ state: State; refresh: () => Promise<void> } | null>(null);

const EMPTY: LeagueData = { me: null, members: [], inactive: [], ranking: { rows: [], games: 0 }, myGames: [] };

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const data = await api<Partial<LeagueData>>("/api/league");
      setState({ status: "ready", data: { ...EMPTY, ...data } });
    } catch (e) {
      const err = e as ApiError;
      setState({ status: "error", message: err.message, noDatabase: err.code === "no_database" });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api<Partial<LeagueData>>("/api/league")
      .then((data) => alive && setState({ status: "ready", data: { ...EMPTY, ...data } }))
      .catch((e: ApiError) =>
        alive && setState({ status: "error", message: e.message, noDatabase: e.code === "no_database" }),
      );
    return () => {
      alive = false;
    };
  }, []);

  // Telefon wraca z tła albo karta znów jest widoczna: ranking mógł się zmienić
  // (np. grę policzył inny telefon), więc pobieramy stan ligi od nowa.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return <LeagueContext.Provider value={{ state, refresh }}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague poza LeagueProvider");
  return ctx;
}

/** Kolor gracza ligi po id (nieznany gracz dostaje kolor wyliczony z id). */
export function usePlayerColors(): (id: string | undefined) => string {
  const { state } = useLeague();
  const members = state.status === "ready" ? [...state.data.members, ...state.data.inactive] : [];
  return (id) => {
    const m = members.find((x) => x.id === id);
    if (m) return playerColor(m.color);
    let h = 0;
    for (const ch of id ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return playerColor(h);
  };
}

/**
 * Sposób wpisywania punktów w lidze (ustawia organizator, obowiązuje na
 * wszystkich telefonach). Bez ligi: suma serii.
 */
export function useEntryMode(): EntryMode {
  const { state } = useLeague();
  return state.status === "ready" ? (state.data.me?.league.entryMode ?? "sum") : "sum";
}

/** Id nieaktywnych graczy ligi (do wyszarzenia w rankingu). */
export function useInactiveIds(): Set<string> {
  const { state } = useLeague();
  return new Set(state.status === "ready" ? state.data.inactive.map((m) => m.id) : []);
}

/** Nazwa gracza ligi po id (także nieaktywnego). */
export function useMemberName(): (id: string) => string {
  const { state } = useLeague();
  const members = state.status === "ready" ? [...state.data.members, ...state.data.inactive] : [];
  return (id) => members.find((m) => m.id === id)?.name ?? "Usunięty gracz";
}
