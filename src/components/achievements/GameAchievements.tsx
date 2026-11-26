"use client";

import { usePlayerColors, usePlayerIcons } from "@/components/league/LeagueProvider";
import { PlayerDot } from "@/components/ui/PlayerDot";
import type { GameState } from "@/lib/game/types";
import { AchBadge } from "./AchBadge";
import { useGameAchievements } from "./useAchievements";

/** „Osiągnięcia w tej grze” pod wynikami. Gdy nikt nic nie zdobył, sekcji nie ma. */
export function GameAchievements({ game, myId }: { game: GameState; myId?: string }) {
  const earned = useGameAchievements(game);
  const colorOf = usePlayerColors();
  const iconOf = usePlayerIcons();
  if (!earned) return null;
  const rows = game.players.flatMap((p) => (earned[p.id] ?? []).map((a) => ({ p, a })));
  if (!rows.length) return null;
  return (
    <section aria-labelledby="game-ach-title">
      <h2 id="game-ach-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        🏆 Osiągnięcia w tej grze · {rows.length}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {rows.map(({ p, a }) => (
          <li key={`${p.id}:${a.id}`} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-line">
            <AchBadge a={a} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <PlayerDot color={colorOf(p.id)} icon={iconOf(p.id)} />
                <span className="truncate">{p.name}</span>
                {p.id === myId && <span className="text-muted">(Ty)</span>}
              </span>
              <span className="mt-0.5 block font-bold">{a.name}</span>
              <span className="block text-sm text-muted">{a.desc}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
