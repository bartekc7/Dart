import { standings } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";

const MEDALS = ["🥇", "🥈", "🥉"];

function seriesWord(n: number) {
  if (n === 1) return "seria";
  const few = n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
  return few ? "serie" : "serii";
}

/** Klasyfikacja zakończonej gry (ekran wyników i podgląd na żywo). */
export function FinalStandings({ game, myId }: { game: GameState; myId?: string }) {
  return (
    <ol className="mt-6 flex flex-col gap-2" aria-label="Klasyfikacja">
      {standings(game).map((s) => (
        <li
          key={s.player.id}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${
            s.place === 1 ? "bg-surface-2 ring-cream" : "bg-surface ring-line"
          }`}
        >
          <span className="w-8 text-center text-2xl">
            {MEDALS[s.place - 1] ?? <span className="font-mono text-lg text-muted">{s.place}.</span>}
          </span>
          <span className="flex-1 truncate text-lg font-semibold">
            {s.player.name}
            {s.player.id === myId && <span className="font-normal text-muted"> (Ty)</span>}
          </span>
          <span className="text-right text-sm text-muted">
            {s.finished ? `${s.rounds} ${seriesWord(s.rounds)}` : `zostało ${s.remaining}`}
          </span>
        </li>
      ))}
    </ol>
  );
}
