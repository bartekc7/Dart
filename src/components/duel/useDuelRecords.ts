"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { soloView } from "@/lib/duelStats";
import { addRecordsGame, type RecordEvent, type RecordsState } from "@/lib/game/records";
import type { GameState } from "@/lib/game/types";
import type { DuelSummary } from "@/lib/server/duels";

/**
 * Nowe rekordy 1 na 1 w tej grze (tylko moje): rekordy z wcześniejszych gier
 * pobieramy raz, a każdą serię porównujemy z nimi na telefonie.
 */
export function useDuelRecords(duelId: string, state: GameState | null, meId: string): RecordEvent[] | null {
  const [base, setBase] = useState<RecordsState | null>(null);
  useEffect(() => {
    let alive = true;
    api<DuelSummary>(`/api/duels/stats?bez=${encodeURIComponent(duelId)}`)
      .then((s) => alive && setBase(s.records))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [duelId]);
  return useMemo(
    () => (state && base ? addRecordsGame(base, soloView(state, meId, state.turns.at(-1)?.at ?? state.startedAt ?? 0)).events : null),
    [state, base, meId],
  );
}
