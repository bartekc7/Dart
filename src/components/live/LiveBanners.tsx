"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useLeague } from "@/components/league/LeagueProvider";
import { currentPlayer, remainingFor, standings } from "@/lib/game/engine";
import { useSeenFinished, useStoredGame } from "@/lib/game/storage";
import { usePoll } from "@/lib/live/usePoll";
import type { LiveGame } from "@/lib/server/league";

export const LIVE_POLL_MS = 3000;

/** Baner „Trwa gra” / „Twoja kolej” / „Koniec gry” na ekranie startowym. */
export function LiveBanners({ myId }: { myId: string }) {
  const poll = usePoll<{ games: LiveGame[] }>("/api/live", LIVE_POLL_MS);
  const [localGame] = useStoredGame();
  const [seen] = useSeenFinished();
  const { refresh } = useLeague();
  const games = poll.status === "ready" ? poll.data.games : [];

  // Gdy czyjaś gra się skończy, odśwież ranking.
  const finished = games
    .filter((g) => g.finished)
    .map((g) => g.id)
    .join(",");
  const known = useRef<string | null>(null);
  useEffect(() => {
    if (poll.status !== "ready") return;
    if (known.current !== null && known.current !== finished) refresh();
    known.current = finished;
  }, [finished, poll.status, refresh]);

  // Jeden baner: trwająca gra, a gdy żadnej nie ma, tylko ostatnia zakończona
  // (starsze są w „Twoje ostatnie gry”).
  const others = games.filter((g) => g.id !== localGame?.id);
  const playing = others.filter((g) => !g.finished);
  const lastFinished = others.find((g) => g.finished);
  const visible =
    playing.length > 0 ? playing : lastFinished && !seen.includes(lastFinished.id) ? [lastFinished] : [];
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {visible.map((g) => (
        <Banner key={g.id} game={g} myId={myId} />
      ))}
    </div>
  );
}

function Banner({ game, myId }: { game: LiveGame; myId: string }) {
  const href = `/na-zywo/${encodeURIComponent(game.id)}`;
  const { state } = game;

  if (game.finished) {
    const winner = standings(state)[0]?.player.name;
    return (
      <Link href={href} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-cream">
        <span className="text-2xl" aria-hidden>
          🏁
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Koniec gry</span>
          <span className="block truncate text-sm text-muted">Wygrywa {winner}</span>
        </span>
        <span className="text-sm font-semibold text-muted">Wyniki ›</span>
      </Link>
    );
  }

  const player = currentPlayer(state);
  if (player?.id === myId) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-red to-red-deep px-4 py-3 text-white shadow-lg shadow-red/20"
      >
        <span className="text-3xl" aria-hidden>
          🎯
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-bold">Twoja kolej!</span>
          <span className="block text-sm opacity-90">
            Zostało <strong className="text-base">{remainingFor(state, myId)}</strong>
          </span>
        </span>
        <span className="text-sm font-semibold opacity-90">Podgląd ›</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line active:bg-surface-2"
    >
      <span className="relative flex size-3 shrink-0" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-red opacity-60" />
        <span className="relative inline-flex size-3 rounded-full bg-red" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Trwa gra do {state.settings.target}</span>
        <span className="block truncate text-sm text-muted">
          {player ? `Rzuca ${player.name}, zostało ${remainingFor(state, player.id)}` : "Gra się kończy"}
        </span>
      </span>
      <span className="text-sm font-semibold text-muted">Podgląd ›</span>
    </Link>
  );
}
