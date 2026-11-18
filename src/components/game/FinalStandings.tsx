"use client";

import { usePlayerColors } from "@/components/league/LeagueProvider";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { playerStats, standings } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export function seriesWord(n: number) {
  if (n === 1) return "seria";
  const few = n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
  return few ? "serie" : "serii";
}

export const fmt = (n: number) => n.toFixed(1).replace(".", ",");

/** Klasyfikacja zakończonej gry (ekran wyników i podgląd na żywo). */
export function FinalStandings({ game, myId }: { game: GameState; myId?: string }) {
  const colorOf = usePlayerColors();
  return (
    <ol className="flex flex-col gap-2" aria-label="Klasyfikacja">
      {standings(game).map((s) => {
        const stats = playerStats(game, s.player.id);
        return (
          <li
            key={s.player.id}
            className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ring-1 ${
              s.place === 1 ? "bg-surface-2 ring-cream" : "bg-surface ring-line"
            }`}
          >
            <span className="w-8 text-center text-2xl">
              {MEDALS[s.place - 1] ?? <span className="font-mono text-lg text-muted">{s.place}.</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2 text-lg font-semibold">
                <PlayerDot color={colorOf(s.player.id)} />
                <span className="truncate">{s.player.name}</span>
                {s.player.id === myId && <span className="shrink-0 font-normal text-muted">(Ty)</span>}
              </span>
              <span className="block text-sm text-muted">
                {stats.series} {seriesWord(stats.series)}
                {!s.finished && ` · zostało ${s.remaining}`}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-mono text-xl font-bold tabular-nums">{fmt(stats.average)}</span>
              <span className="block text-xs text-muted">śr. na serię</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Kilka liczb z całej gry. */
export function GameStats({ game }: { game: GameState }) {
  const all = game.players.map((p) => ({ name: p.name, ...playerStats(game, p.id) }));
  const best = all.reduce((a, b) => (b.best > a.best ? b : a), all[0]);
  const series = all.reduce((n, p) => n + p.series, 0);
  const points = all.reduce((n, p) => n + p.points, 0);
  const busts = all.reduce((n, p) => n + p.busts, 0);

  const tiles = [
    { label: "Najlepsza seria", value: String(best?.best ?? 0), note: best?.best ? best.name : "–" },
    { label: "Śr. na serię", value: fmt(series ? points / series : 0), note: "wszyscy" },
    { label: "Serie", value: String(series), note: busts ? `${busts} za dużo` : "bez przekroczeń" },
  ];

  return (
    <dl className="grid grid-cols-3 gap-2">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl bg-surface px-2 py-3 text-center ring-1 ring-line">
          <dt className="text-xs text-muted">{t.label}</dt>
          <dd className="font-mono text-2xl font-bold tabular-nums">{t.value}</dd>
          <dd className="truncate text-xs text-muted">{t.note}</dd>
        </div>
      ))}
    </dl>
  );
}
