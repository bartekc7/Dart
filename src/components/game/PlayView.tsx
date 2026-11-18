"use client";

import Link from "next/link";
import { useState } from "react";
import {
  applyTurn,
  currentPlayer,
  isGameOver,
  lastTurnOf,
  placeOf,
  remainingFor,
  undoLastTurn,
} from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import { Keypad } from "./Keypad";
import { addRecord, toRecord } from "@/lib/game/history";
import { useHistory } from "@/lib/game/storage";

const MEDALS = ["🥇", "🥈", "🥉"];

type Feedback = { text: string; bust: boolean } | null;

export function PlayView({
  game,
  onChange,
}: {
  game: GameState;
  onChange: (g: GameState | null) => void;
}) {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [history, setHistory] = useHistory();

  const player = currentPlayer(game)!;
  const remaining = remainingFor(game, player.id);

  function submit() {
    const score = Number(input);
    const next = applyTurn(game, score);
    const turn = next.turns.at(-1)!;
    const place = placeOf(next, player.id);
    setFeedback(
      turn.bust
        ? { text: `${player.name}: ${score} – za dużo, nie liczy się`, bust: true }
        : place
          ? { text: `${player.name} kończy na ${place}. miejscu! 🎯`, bust: false }
          : { text: `${player.name}: +${score}, zostało ${remainingFor(next, player.id)}`, bust: false },
    );
    setInput("");
    if (isGameOver(next)) setHistory(addRecord(history ?? [], toRecord(next)));
    onChange(next);
  }

  function undo() {
    const last = game.turns.at(-1);
    if (!last) return;
    const who = game.players.find((p) => p.id === last.playerId)?.name;
    setFeedback({ text: `Cofnięto serię gracza ${who}`, bust: false });
    setInput("");
    onChange(undoLastTurn(game));
  }

  return (
    <main className="screen-fit flex flex-col gap-3">
      {/* Najważniejsze: kto rzuca i ile mu zostało. */}
      <section className="shrink-0 rounded-3xl bg-gradient-to-br from-red to-red-deep px-3 pt-2 pb-2.5 text-center text-white shadow-lg shadow-red/20">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="Wróć na start"
            className="flex size-10 items-center justify-center rounded-full bg-black/20 text-2xl"
          >
            ‹
          </Link>
          <p className="min-w-0 truncate px-2 text-lg">
            Rzuca <span className="font-bold">{player.name}</span>
          </p>
          <button
            type="button"
            onClick={undo}
            disabled={game.turns.length === 0}
            className="h-10 rounded-full bg-black/20 px-3 text-sm font-semibold disabled:opacity-40"
          >
            ↶ Cofnij
          </button>
        </div>
        <p className="text-6xl leading-tight font-bold tabular-nums max-[380px]:text-5xl">{remaining}</p>
        {feedback ? (
          <p role="status" className="mx-auto mt-1 w-fit rounded-full bg-black/25 px-3 py-0.5 text-sm font-medium">
            {feedback.bust ? "✋ " : feedback.text.endsWith("🎯") ? "" : "✓ "}
            {feedback.text}
          </p>
        ) : (
          <p className="mt-1 text-sm uppercase tracking-wider opacity-90">
            zostało · gra do {game.settings.target}
          </p>
        )}
      </section>

      <ol
        aria-label="Wyniki"
        className={`-mx-0.5 grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto p-0.5 ${game.players.length > 3 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {game.players.map((p) => {
          const active = p.id === player.id;
          const place = placeOf(game, p.id);
          const last = lastTurnOf(game, p.id);
          return (
            <li
              key={p.id}
              aria-current={active || undefined}
              className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-1 ring-1 ${
                active ? "bg-surface-2 ring-cream" : place ? "bg-surface/50 ring-line/50" : "bg-surface ring-line"
              }`}
            >
              <span className={`size-2 shrink-0 rounded-full ${active ? "bg-cream" : "bg-transparent"}`} />
              <span className={`flex-1 truncate font-medium ${place ? "text-muted" : ""}`}>{p.name}</span>
              {place ? (
                <span className="text-lg font-bold" aria-label={`${place}. miejsce`}>
                  {MEDALS[place - 1] ?? `${place}.`}
                </span>
              ) : (
                <>
                  {last && game.players.length <= 3 && (
                    <span className={`text-sm ${last.bust ? "text-red line-through" : "text-muted"}`}>
                      {last.bust ? last.scored : `+${last.scored}`}
                    </span>
                  )}
                  <span className="text-right font-mono text-xl font-bold tabular-nums">
                    {remainingFor(game, p.id)}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>

      <div className="shrink-0">
        <Keypad value={input} onChange={setInput} onSubmit={submit} />
      </div>
    </main>
  );
}
