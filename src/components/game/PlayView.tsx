"use client";

import Link from "next/link";
import { useState } from "react";
import {
  applyTurn,
  canEndEarly,
  currentPlayer,
  endGame,
  formatDarts,
  isValidDart,
  lastTurnOf,
  placeOf,
  playerStats,
  remainingFor,
  undoLastTurn,
} from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import { useEntryMode, usePlayerColors } from "@/components/league/LeagueProvider";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { accentBackground, activeRowStyle } from "@/lib/colors";
import { useWakeLock } from "@/lib/useWakeLock";
import { useVoice } from "@/lib/game/storage";
import { say } from "@/lib/speech";
import { DartPad } from "./DartPad";
import { Keypad } from "./Keypad";

const MEDALS = ["🥇", "🥈", "🥉"];
/** Do komunikatu głosowego: „kończy na drugim miejscu”. */
const ORDINALS = ["pierwszym", "drugim", "trzecim", "czwartym", "piątym", "szóstym", "siódmym", "ósmym", "dziewiątym", "dziesiątym"];

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
  const mode = useEntryMode();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const colorOf = usePlayerColors();
  // Telefon leży przy tablicy: ekran nie gaśnie między seriami.
  useWakeLock();
  const [voice] = useVoice();

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
    if (voice) {
      const nextPlayer = currentPlayer(next);
      const first = turn.bust
        ? `${player.name}, za dużo.`
        : place
          ? `${player.name} kończy na ${ORDINALS[place - 1] ?? `${place}.`} miejscu!`
          : `${player.name}, zostało ${remainingFor(next, player.id)}.`;
      say(nextPlayer ? `${first} Teraz rzuca ${nextPlayer.name}.` : `${first} Koniec gry.`);
    }
    // Krótkie potwierdzenie dotykiem (Android; iPhone nie obsługuje wibracji w przeglądarce).
    vibrate(turn.bust ? [70, 50, 70] : place ? [30, 40, 120] : 15);
    setInput("");
    onChange(next);
  }

  function finishNow() {
    setConfirmEnd(false);
    if (!canEndEarly(game)) return;
    vibrate([30, 40, 120]);
    onChange(endGame(game));
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
          const left = remainingFor(game, p.id);
          const stats = playerStats(game, p.id);
          // Blisko końca: brakuje tyle, ile da się trafić jedną rzutką.
          const close = !place && left > 0 && isValidDart(left);
          return (
            <li
              key={p.id}
              aria-current={active || undefined}
              className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-1 land:py-2 ${
                active ? "" : place ? "bg-surface/50 ring-1 ring-line/50" : close ? "bg-surface ring-2 ring-green/60" : "bg-surface ring-1 ring-line"
              }`}
              style={active ? activeRowStyle(colorOf(p.id)) : undefined}
            >
              <PlayerDot color={colorOf(p.id)} big={active} />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className={`truncate land:text-xl ${active ? "font-bold" : "font-medium"} ${place ? "text-muted" : ""}`}>{p.name}</span>
                {!place && last && (
                  <span className="truncate text-xs text-muted land:text-sm">
                    <span className={last.bust ? "text-red line-through" : ""}>
                      {last.darts && last.darts.length > 1 ? formatDarts(last.darts) : last.bust ? last.scored : `+${last.scored}`}
                    </span>
                    {" · śr. "}
                    {Math.round(stats.average)}
                  </span>
                )}
              </span>
              {place ? (
                <span className="text-lg font-bold" aria-label={`${place}. miejsce`}>
                  {MEDALS[place - 1] ?? `${place}.`}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  {close && (
                    <span className="rounded-full bg-green/15 px-1.5 text-xs font-bold text-green" title="Może skończyć jedną rzutką">
                      🎯
                    </span>
                  )}
                  <span className="text-right font-mono text-xl font-bold tabular-nums land:text-3xl">{left}</span>
                </span>
              )}
            </li>
          );
        })}
        {canEndEarly(game) && (
          <li className="col-span-full pt-1">
            <button
              type="button"
              onClick={() => setConfirmEnd(!confirmEnd)}
              aria-expanded={confirmEnd}
              className="w-full rounded-xl border border-dashed border-line py-2 text-sm font-semibold text-muted active:bg-surface-2"
            >
              🏁 Zakończ grę teraz
            </button>
          </li>
        )}
      </ol>

      {/* Na tablecie i komputerze klawiatura zajmuje prawą kolumnę na całą wysokość. */}
      <div className="shrink-0 land:col-start-2 land:row-span-2 land:row-start-1 land:flex land:min-h-0 land:flex-col">
        {confirmEnd && canEndEarly(game) ? (
          // Potwierdzenie w miejscu klawiatury, żeby zawsze było widać przyciski.
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4 ring-1 ring-line">
            <p className="text-lg font-semibold">Zakończyć grę teraz?</p>
            <p className="text-muted">
              Pozostali gracze dostaną miejsca według tego, ile im zostało. Gra trafi do rankingu.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className="min-h-14 rounded-2xl bg-surface text-lg font-semibold ring-1 ring-line"
              >
                Gramy dalej
              </button>
              <button type="button" onClick={finishNow} className="min-h-14 rounded-2xl bg-green text-lg font-semibold text-white">
                Zakończ
              </button>
            </div>
          </div>
        ) : mode === "darts" ? (
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
