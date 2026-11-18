"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FinalStandings } from "@/components/game/FinalStandings";
import { useLeague } from "@/components/league/LeagueProvider";
import { LoadError, Loading } from "@/components/league/StatusScreens";
import { Button, ButtonLink } from "@/components/ui/Button";
import { currentPlayer, placeOf, remainingFor, standings } from "@/lib/game/engine";
import { useSeenFinished } from "@/lib/game/storage";
import type { GameState } from "@/lib/game/types";
import { usePoll } from "@/lib/live/usePoll";
import type { LiveGame } from "@/lib/server/league";

const MEDALS = ["🥇", "🥈", "🥉"];
const POLL_MS = 2500;

/** Podgląd gry na żywo dla graczy, którzy nie wpisują punktów. */
export function LiveView({ id }: { id: string }) {
  const { state } = useLeague();
  const me = state.status === "ready" ? state.data.me : null;
  const poll = usePoll<{ game: LiveGame }>(me ? `/api/live/${encodeURIComponent(id)}` : null, POLL_MS);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <LoadError {...state} />;
  if (!me) return <Gone text="Ten telefon nie należy do żadnej ligi." />;
  if (poll.status === "loading") return <Loading />;
  if (poll.status === "error") {
    if (poll.error.status === 404) return <Gone text="Ta gra już się nie toczy." />;
    return <p className="mt-6 text-center text-muted">Brak połączenia. Próbuję ponownie…</p>;
  }

  const game = poll.data.game;
  return game.finished ? (
    <Finished game={game} myId={me.member.id} />
  ) : (
    <Playing game={game} myId={me.member.id} />
  );
}

function Gone({ text }: { text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <p className="text-muted">{text}</p>
      <ButtonLink href="/" className="max-w-xs">
        Wróć na start
      </ButtonLink>
    </div>
  );
}

function lastThrow(state: GameState) {
  const t = state.turns.at(-1);
  if (!t) return null;
  const who = state.players.find((p) => p.id === t.playerId)?.name;
  if (t.bust) return { text: `${who}: ${t.scored} – za dużo, nie liczy się`, bust: true };
  const place = placeOf(state, t.playerId);
  if (place && remainingFor(state, t.playerId) === 0)
    return { text: `${who} kończy na ${place}. miejscu! 🎯`, bust: false };
  return { text: `${who}: +${t.scored}`, bust: false };
}

function Playing({ game, myId }: { game: LiveGame; myId: string }) {
  const { state } = game;
  const player = currentPlayer(state);
  const mine = player?.id === myId;
  const last = lastThrow(state);

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-live="polite"
        className={`rounded-3xl px-4 py-4 text-center ${
          mine
            ? "bg-gradient-to-br from-red to-red-deep text-white shadow-lg shadow-red/20"
            : "bg-surface ring-1 ring-line"
        }`}
      >
        <p className="text-lg">
          {mine ? (
            <strong className="text-2xl">🎯 Twoja kolej!</strong>
          ) : (
            <>
              Rzuca <strong>{player?.name}</strong>
            </>
          )}
        </p>
        <p className="text-7xl leading-tight font-bold tabular-nums">
          {player ? remainingFor(state, player.id) : "–"}
        </p>
        <p className={`text-sm uppercase tracking-wider ${mine ? "opacity-90" : "text-muted"}`}>
          zostało · gra do {state.settings.target}
        </p>
        {last && (
          <p
            className={`mx-auto mt-2 w-fit rounded-full px-3 py-0.5 text-sm font-medium ${
              mine ? "bg-black/25" : last.bust ? "bg-red/10 text-red" : "bg-surface-2"
            }`}
          >
            Ostatnio: {last.text}
          </p>
        )}
      </section>

      <ol aria-label="Wyniki" className="flex flex-col gap-1.5">
        {state.players.map((p) => {
          const active = p.id === player?.id;
          const place = placeOf(state, p.id);
          return (
            <li
              key={p.id}
              aria-current={active || undefined}
              className={`flex min-h-12 items-center gap-2 rounded-xl px-3 ring-1 ${
                active ? "bg-surface-2 ring-cream" : place ? "bg-surface/50 ring-line/50" : "bg-surface ring-line"
              }`}
            >
              <span className={`size-2 shrink-0 rounded-full ${active ? "bg-cream" : "bg-transparent"}`} />
              <span className={`flex-1 truncate text-lg font-medium ${place ? "text-muted" : ""}`}>
                {p.name}
                {p.id === myId && <span className="font-normal text-muted"> (Ty)</span>}
              </span>
              {place ? (
                <span className="text-lg font-bold" aria-label={`${place}. miejsce`}>
                  {MEDALS[place - 1] ?? `${place}.`}
                </span>
              ) : (
                <span className="font-mono text-xl font-bold tabular-nums">{remainingFor(state, p.id)}</span>
              )}
            </li>
          );
        })}
      </ol>

      <p className="text-center text-sm text-muted">
        Punkty wpisuje {game.scorer.name ?? "inny telefon"}. Ekran odświeża się sam.
      </p>
    </div>
  );
}

function Finished({ game, myId }: { game: LiveGame; myId: string }) {
  const router = useRouter();
  const { refresh } = useLeague();
  const [, markSeen] = useSeenFinished();
  const winner = standings(game.state)[0]?.player;

  useEffect(() => {
    refresh(); // ranking na starcie już z tą grą
  }, [refresh]);

  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-col items-center pt-2 text-center">
        <p className="text-6xl">🏆</p>
        <h2 className="mt-3 text-3xl font-bold">
          {winner?.id === myId ? "Wygrywasz!" : `${winner?.name} wygrywa!`}
        </h2>
        <p className="mt-1 text-muted">Gra do {game.state.settings.target} · klasyfikacja końcowa</p>
      </section>
      <FinalStandings game={game.state} myId={myId} />
      <div className="mt-auto pt-6">
        <Button
          onClick={() => {
            markSeen(game.id);
            router.push("/");
          }}
        >
          Wróć do rankingu
        </Button>
      </div>
    </div>
  );
}
