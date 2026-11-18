"use client";

import Link from "next/link";
import { useState } from "react";
import {
  applyTurn,
  currentPlayer,
  formatDarts,
  lastTurnOf,
  placeOf,
  remainingFor,
  undoLastTurn,
} from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import { usePlayerColors } from "@/components/league/LeagueProvider";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { accentBackground, activeRowStyle } from "@/lib/colors";
import { useEntryMode } from "@/lib/game/storage";
import { DartPad } from "./DartPad";
import { Keypad } from "./Keypad";

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
  const [mode] = useEntryMode();
  const colorOf = usePlayerColors();

  const player = currentPlayer(game)!;
  const remaining = remainingFor(game, player.id);

  function submit(score: number, darts?: number[]) {
    const next = applyTurn(game, score, darts);
    const turn = next.turns.at(-1)!;
    const place = placeOf(next, player.id);
    const shown = darts && darts.length > 1 ? `${formatDarts(darts)} = ${score}` : String(score);
    setFeedback(
      turn.bust
        ? { text: `${player.name}: ${shown} – za dużo, nie liczy się`, bust: true }
        : place
          ? { text: `${player.name} kończy na ${place}. miejscu! 🎯`, bust: false }
          : { text: `${player.name}: ${darts && darts.length > 1 ? shown : `+${shown}`}, zostało ${remainingFor(next, player.id)}`, bust: false },
    );
    // Krótkie potwierdzenie dotykiem (Android; iPhone nie obsługuje wibracji w przeglądarce).
    vibrate(turn.bust ? [70, 50, 70] : place ? [30, 40, 120] : 15);
    setInput("");
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
    <main className="screen-fit wide mx-auto flex w-full max-w-xl flex-col gap-3 land:max-w-none land:grid land:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] land:grid-rows-[auto_minmax(0,1fr)] land:gap-x-8 land:gap-y-4">
      {/* Najważniejsze: kto rzuca i ile mu zostało. */}
      <section
        className="shrink-0 rounded-3xl px-3 pt-2 pb-2.5 text-center text-white transition-[background-image] duration-300"
        style={accentBackground(colorOf(player.id))}
      >
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
        <p className="text-6xl leading-tight font-bold tabular-nums max-[380px]:text-5xl [@media(min-width:48rem)_and_(min-height:36rem)]:text-8xl">{remaining}</p>
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
        className={`-mx-0.5 grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto p-0.5 land:col-start-1 land:gap-2 ${game.players.length > 3 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {game.players.map((p) => {
          const active = p.id === player.id;
          const place = placeOf(game, p.id);
          const last = lastTurnOf(game, p.id);
          return (
            <li
              key={p.id}
              aria-current={active || undefined}
              className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-1 land:py-2 ${
                active ? "" : place ? "bg-surface/50 ring-1 ring-line/50" : "bg-surface ring-1 ring-line"
              }`}
              style={active ? activeRowStyle(colorOf(p.id)) : undefined}
            >
              <PlayerDot color={colorOf(p.id)} big={active} />
              <span className={`flex-1 truncate land:text-xl ${active ? "font-bold" : "font-medium"} ${place ? "text-muted" : ""}`}>{p.name}</span>
              {place ? (
                <span className="text-lg font-bold" aria-label={`${place}. miejsce`}>
                  {MEDALS[place - 1] ?? `${place}.`}
                </span>
              ) : (
                <>
                  {last && game.players.length <= 3 && (
                    <span className={`text-sm land:text-base ${last.bust ? "text-red line-through" : "text-muted"}`}>
                      {last.bust ? last.scored : `+${last.scored}`}
                    </span>
                  )}
                  <span className="text-right font-mono text-xl font-bold tabular-nums land:text-3xl">
                    {remainingFor(game, p.id)}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>

      {/* Na tablecie i komputerze klawiatura zajmuje prawą kolumnę na całą wysokość. */}
      <div className="shrink-0 land:col-start-2 land:row-span-2 land:row-start-1 land:flex land:min-h-0 land:flex-col">
        {mode === "darts" ? (
          // key: nowa seria (także po cofnięciu) zaczyna od pustych rzutek.
          <DartPad key={game.turns.length} remaining={remaining} onSubmit={submit} />
        ) : (
          <Keypad value={input} onChange={setInput} onSubmit={() => submit(Number(input))} remaining={remaining} />
        )}
      </div>
    </main>
  );
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}
