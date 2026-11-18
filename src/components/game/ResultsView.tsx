"use client";

import { useCallback, useEffect, useState } from "react";
import { useLeague } from "@/components/league/LeagueProvider";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { rematch, standings, undoLastTurn } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";

type Save = { status: "saving" } | { status: "saved" } | { status: "error"; message: string };

const MEDALS = ["🥇", "🥈", "🥉"];

function seriesWord(n: number) {
  if (n === 1) return "seria";
  const few = n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
  return few ? "serie" : "serii";
}

export function ResultsView({
  game,
  onChange,
}: {
  game: GameState;
  onChange: (g: GameState | null) => void;
}) {
  const { refresh } = useLeague();
  const [save, setSave] = useState<Save>({ status: "saving" });
  const [undoError, setUndoError] = useState<string | null>(null);

  // Zapis do rankingu ligi. Serwer sam przelicza miejsca, a ponowny zapis tej
  // samej gry niczego nie dubluje, więc można bezpiecznie ponawiać.
  const saveGame = useCallback(async () => {
    setSave({ status: "saving" });
    try {
      await api("/api/games", {
        body: {
          id: game.id,
          target: game.settings.target,
          players: game.players.map((p) => p.id),
          turns: game.turns,
        },
      });
      setSave({ status: "saved" });
      refresh();
    } catch (e) {
      setSave({ status: "error", message: (e as Error).message });
    }
  }, [game, refresh]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- zapis startuje po wejściu na ekran
    saveGame();
  }, [saveGame]);

  async function undo() {
    setUndoError(null);
    try {
      if (game.id) await api(`/api/games/${encodeURIComponent(game.id)}`, { method: "DELETE" });
      refresh();
      onChange(undoLastTurn(game));
    } catch (e) {
      setUndoError((e as Error).message);
    }
  }

  const table = standings(game);
  const winner = table[0];

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center pt-6 text-center">
        <p className="text-6xl">🏆</p>
        <h1 className="mt-3 text-3xl font-bold">{winner.player.name} wygrywa!</h1>
        <p className="mt-1 text-muted">Gra do {game.settings.target} · klasyfikacja końcowa</p>
        <SaveStatus save={save} onRetry={saveGame} />
      </section>

      <ol className="mt-6 flex flex-col gap-2" aria-label="Klasyfikacja">
        {table.map((s) => (
          <li
            key={s.player.id}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${
              s.place === 1 ? "bg-surface-2 ring-cream" : "bg-surface ring-line"
            }`}
          >
            <span className="w-8 text-center text-2xl">
              {MEDALS[s.place - 1] ?? <span className="font-mono text-lg text-muted">{s.place}.</span>}
            </span>
            <span className="flex-1 truncate text-lg font-semibold">{s.player.name}</span>
            <span className="text-right text-sm text-muted">
              {s.finished
                ? `${s.rounds} ${seriesWord(s.rounds)}`
                : `zostało ${s.remaining}`}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <Button onClick={() => onChange(rematch(game))}>Rewanż</Button>
        <Button variant="secondary" onClick={() => onChange(null)}>
          Nowa gra
        </Button>
        <button
          type="button"
          onClick={undo}
          className="py-2 text-sm text-muted"
        >
          ↶ Pomyłka? Cofnij ostatnią serię
        </button>
        {undoError && <p className="text-center text-sm text-red">{undoError}</p>}
      </div>
    </main>
  );
}

function SaveStatus({ save, onRetry }: { save: Save; onRetry: () => void }) {
  if (save.status === "saving") {
    return <p className="mt-2 text-sm text-muted">Zapisuję wynik w lidze…</p>;
  }
  if (save.status === "saved") {
    return <p className="mt-2 text-sm font-medium text-green">✓ Zapisano w rankingu ligi</p>;
  }
  return (
    <div role="alert" className="mt-3 flex flex-col items-center gap-2 rounded-2xl bg-red/10 px-4 py-3">
      <p className="text-sm font-medium text-red">Wynik nie został zapisany. {save.message}</p>
      <button type="button" onClick={onRetry} className="min-h-11 rounded-xl bg-surface-2 px-4 font-semibold ring-1 ring-line">
        Spróbuj ponownie
      </button>
    </div>
  );
}
