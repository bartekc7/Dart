"use client";

import { useEffect, useState } from "react";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { api } from "@/lib/api";
import { playerColor } from "@/lib/colors";
import type { MemberStats } from "@/lib/server/league";
import { useLeague } from "./LeagueProvider";
import { HitMap } from "./HitMap";
import { MyGames } from "./MyGames";
import { Loading } from "./StatusScreens";

const num = (n: number, digits = 1) => n.toFixed(digits).replace(".", ",");

/** Karta gracza: wyniki i statystyki ze wszystkich gier ligowych. */
export function PlayerCard({ id }: { id: string }) {
  const { state } = useLeague();
  const myId = state.status === "ready" ? state.data.me?.member.id : undefined;
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<MemberStats>(`/api/members/${encodeURIComponent(id)}/stats`)
      .then((s) => alive && setStats(s))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) return <p className="py-10 text-center text-muted">{error}</p>;
  if (!stats) return <Loading />;

  const color = playerColor(stats.color);
  const tiles: { label: string; value: string }[] = [
    { label: "Gry", value: String(stats.games) },
    { label: "Wygrane", value: String(stats.wins) },
    { label: "Śr. miejsce", value: stats.avgPlace === null ? "–" : num(stats.avgPlace) },
    { label: "Śr. na serię", value: stats.series ? num(stats.avgPerSeries) : "–" },
    { label: "Najlepsza seria", value: stats.series ? String(stats.bestSeries) : "–" },
    { label: "Przekroczenia", value: String(stats.busts) },
  ];

  return (
    <>
      <section
        className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line"
        style={{ boxShadow: `inset 4px 0 0 ${color}` }}
      >
        <PlayerDot color={color} big />
        <h2 className="min-w-0 flex-1 truncate text-2xl font-bold">{stats.name}</h2>
        {stats.id === myId && (
          <span className="shrink-0 rounded-full bg-cream px-2 text-xs font-bold text-board">TY</span>
        )}
      </section>

      {stats.games === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
          Brak gier ligowych. Statystyki pojawią się po pierwszej grze.
        </p>
      ) : (
        <>
          <section aria-label="Statystyki" className="grid grid-cols-3 gap-2">
            {tiles.map((t) => (
              <div key={t.label} className="flex flex-col items-center rounded-2xl bg-surface px-2 py-3 text-center ring-1 ring-line">
                <span className="font-mono text-2xl font-bold tabular-nums">{t.value}</span>
                <span className="mt-0.5 text-xs leading-tight text-muted">{t.label}</span>
              </div>
            ))}
          </section>
          <p className="-mt-3 text-xs text-muted">Ze wszystkich gier ligowych (bez gier w pojedynkę).</p>
          <HitMap hits={stats.hits} games={stats.hitGames} />
          <MyGames games={stats.recent} title="Ostatnie gry" />
        </>
      )}
    </>
  );
}
