"use client";

import { useCallback, useEffect, useState } from "react";
import { useLeague } from "@/components/league/LeagueProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { rematch, standings, undoLastTurn } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import { FinalStandings, GameStats } from "./FinalStandings";

type Save = { status: "saving" } | { status: "saved" } | { status: "error"; message: string };

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
    <main className="flex flex-1 flex-col gap-4">
      <section className="flex flex-col items-center pt-2 text-center">
        <h1 className="text-3xl font-bold">🏆 {winner.player.name} wygrywa!</h1>
        <p className="mt-1 text-muted">Gra do {game.settings.target}</p>
        <SaveStatus save={save} onRetry={saveGame} solo={game.players.length === 1} />
      </section>

      <FinalStandings game={game} />
      <GameStats game={game} />

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onChange(rematch(game))}>Rewanż</Button>
          <Button variant="secondary" onClick={() => onChange(null)}>
            Nowa gra
          </Button>
        </div>
        <ButtonLink href="/" variant="secondary">
          Wróć do rankingu
        </ButtonLink>
        <button type="button" onClick={undo} className="py-2 text-sm text-muted">
          ↶ Pomyłka? Cofnij ostatnią serię
        </button>
        {undoError && <p className="text-center text-sm text-red">{undoError}</p>}
      </div>
    </main>
  );
}

function SaveStatus({ save, onRetry, solo }: { save: Save; onRetry: () => void; solo: boolean }) {
  if (save.status === "saving") {
    return <p className="mt-2 text-sm text-muted">Zapisuję wynik w lidze…</p>;
  }
  if (save.status === "saved" && solo) {
    // Ranking liczy tylko gry co najmniej dwóch graczy.
    return <p className="mt-2 text-sm text-muted">Gra w pojedynkę – nie liczy się do rankingu</p>;
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
