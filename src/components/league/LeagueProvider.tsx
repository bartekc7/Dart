"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import type { RankingRow } from "@/lib/game/history";
import type { Me, Member } from "@/lib/server/league";

export interface LeagueData {
  me: Me | null;
  members: Member[];
  ranking: { rows: RankingRow[]; games: number };
}

type State =
  | { status: "loading" }
  | { status: "ready"; data: LeagueData }
  | { status: "error"; message: string; noDatabase: boolean };

const LeagueContext = createContext<{ state: State; refresh: () => Promise<void> } | null>(null);

const EMPTY: LeagueData = { me: null, members: [], ranking: { rows: [], games: 0 } };

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

  return <LeagueContext.Provider value={{ state, refresh }}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague poza LeagueProvider");
  return ctx;
}
