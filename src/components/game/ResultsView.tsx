"use client";

import { Button } from "@/components/ui/Button";
import { rematch, standings, undoLastTurn } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";

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
  const table = standings(game);
  const winner = table[0];

  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-col items-center pt-6 text-center">
        <p className="text-6xl">🏆</p>
        <h1 className="mt-3 text-3xl font-bold">{winner.player.name} wygrywa!</h1>
        <p className="mt-1 text-muted">Gra do {game.settings.target} · klasyfikacja końcowa</p>
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
          onClick={() => onChange(undoLastTurn(game))}
          className="py-2 text-sm text-muted"
        >
          ↶ Pomyłka? Cofnij ostatnią serię
        </button>
      </div>
    </main>
  );
}
