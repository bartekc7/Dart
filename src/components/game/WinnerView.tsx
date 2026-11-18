"use client";

import { Button } from "@/components/ui/Button";
import { rematch, remainingFor } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";

export function WinnerView({
  game,
  onChange,
}: {
  game: GameState;
  onChange: (g: GameState | null) => void;
}) {
  const winner = game.players.find((p) => p.id === game.winnerId)!;
  const rounds = game.turns.filter((t) => t.playerId === winner.id).length;
  const others = game.players
    .filter((p) => p.id !== winner.id)
    .sort((a, b) => remainingFor(game, a.id) - remainingFor(game, b.id));

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-7xl">🏆</p>
        <h1 className="mt-4 text-4xl font-bold">{winner.name} wygrywa!</h1>
        <p className="mt-2 text-muted">
          Równo {game.settings.target} w {rounds} {rounds === 1 ? "serii" : "seriach"}
        </p>

        {others.length > 0 && (
          <ol className="mt-8 w-full flex flex-col gap-1.5">
            {others.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2 ring-1 ring-line"
              >
                <span className="w-6 font-mono text-muted">{i + 2}.</span>
                <span className="flex-1 truncate text-left font-medium">{p.name}</span>
                <span className="text-sm text-muted">zostało</span>
                <span className="w-12 text-right font-mono text-xl font-bold">
                  {remainingFor(game, p.id)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="flex flex-col gap-3 pt-6">
        <Button onClick={() => onChange(rematch(game))}>Rewanż</Button>
        <Button variant="secondary" onClick={() => onChange(null)}>
          Nowa gra
        </Button>
      </div>
    </main>
  );
}
