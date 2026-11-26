"use client";

import { useCallback, useEffect, useState } from "react";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { formatDuration } from "@/lib/game/engine";
import type { GameRecord } from "@/lib/game/history";
import { useLeague, usePlayerColors, usePlayerIcons } from "./LeagueProvider";
import { Loading } from "./StatusScreens";

const MEDALS = ["🥇", "🥈", "🥉"];

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `dziś ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `wczoraj ${time}`;
  return `${d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })} ${time}`;
}

/** Wszystkie gry ligi; organizator może usunąć grę zapisaną przez pomyłkę. */
export function GameHistory() {
  const { state, refresh } = useLeague();
  const colorOf = usePlayerColors();
  const iconOf = usePlayerIcons();
  const organizer = state.status === "ready" && state.data.me?.member.isOrganizer === true;
  const [games, setGames] = useState<GameRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setGames((await api<{ games: GameRecord[] }>("/api/games")).games);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pobranie listy po wejściu na ekran
    load();
  }, [load]);

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/games/${encodeURIComponent(id)}`, { method: "DELETE" });
      setConfirm(null);
      await Promise.all([load(), refresh()]);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  if (!games) return error ? <p className="py-10 text-center text-muted">{error}</p> : <Loading />;
  if (games.length === 0)
    return (
      <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
        Nie ma jeszcze zapisanych gier.
      </p>
    );

  return (
    <>
      <FormError message={error} />
      <ul className="flex flex-col gap-2">
        {games.map((g) => (
          <li key={g.id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
            <div className="mb-1.5 flex items-baseline justify-between text-sm text-muted">
              <span>{when(g.finishedAt)}</span>
              <span>
                do {g.target}
                {g.durationMs != null && ` · ⏱ ${formatDuration(g.durationMs)}`}
                {g.results.length === 1 && " · w pojedynkę"}
              </span>
            </div>
            <ol className="flex flex-col gap-0.5">
              {g.results.map((r) => (
                <li key={r.id ?? r.name} className="flex items-center gap-2">
                  <span className="w-6 text-center">
                    {MEDALS[r.place - 1] ?? <span className="font-mono text-sm text-muted">{r.place}.</span>}
                  </span>
                  <PlayerDot color={colorOf(r.id)} icon={iconOf(r.id)} />
                  <span className={`truncate ${r.place === 1 ? "font-semibold" : ""}`}>{r.name}</span>
                </li>
              ))}
            </ol>
            {organizer &&
              (confirm === g.id ? (
                <div className="mt-3 flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
                  <p className="text-sm">Usunąć tę grę? Zniknie z historii i rankingu. Tego nie da się cofnąć.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>
                      Anuluj
                    </Button>
                    <Button onClick={() => remove(g.id)} disabled={busy}>
                      Usuń
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirm(g.id)}
                  className="mt-2 text-sm text-muted underline-offset-2 hover:underline"
                >
                  Usuń grę
                </button>
              ))}
          </li>
        ))}
      </ul>
      {games.length >= 50 && <p className="text-center text-xs text-muted">Pokazujemy 50 ostatnich gier.</p>}
    </>
  );
}
