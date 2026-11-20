"use client";

import { useState } from "react";
import { DARTS_PER_TURN, dartName, dartValue, isValidDart, type Mult } from "@/lib/game/engine";
import { KeyGrid, type Key } from "./Keypad";

const PREFIX = { 1: "", 2: "D", 3: "T" } as const;

/**
 * Wpisywanie serii rzutka po rzutce. Seria kończy się po trzeciej rzutce
 * albo wcześniej, gdy gracz trafi równo lub przekroczy cel (dalej nie rzuca).
 */
export function DartPad({
  remaining,
  onSubmit,
}: {
  remaining: number;
  onSubmit: (score: number, darts: number[]) => void;
}) {
  const [darts, setDarts] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [mult, setMult] = useState<Mult>(1);

  const total = darts.reduce((a, b) => a + b, 0);
  // Rzutka, którą da się skończyć równo (np. zostało 40 → D20).
  const left = remaining - total;
  const finish = left > 0 && isValidDart(left) ? left : null;
  const field = input === "" ? null : Number(input);
  const n = field === null ? null : dartValue(field, mult);
  const invalid = field !== null && n === null;
  const label = input ? `${PREFIX[mult]}${input}` : PREFIX[mult];
  // Ostatnia rzutka serii: trzecia albo ta, która kończy lub przekracza cel.
  const last =
    darts.length === DARTS_PER_TURN - 1 || (n !== null && !invalid && total + n >= remaining);

  function commit(v: number, text = String(v)) {
    const next = [...darts, v];
    const sum = total + v;
    setInput("");
    setMult(1);
    if (next.length === DARTS_PER_TURN || sum >= remaining) {
      setDarts([]);
      setLabels([]);
      onSubmit(sum, next);
    } else {
      setDarts(next);
      setLabels([...labels, text]);
    }
  }

  function press(k: Key) {
    if (k === "⌫") {
      if (input) return setInput(input.slice(0, -1));
      // Puste pole: wracamy do poprzedniej rzutki, żeby ją poprawić.
      if (darts.length) {
        setInput(String(darts.at(-1)));
        setDarts(darts.slice(0, -1));
        setLabels(labels.slice(0, -1));
      }
      return;
    }
    if (k === "OK") return n !== null && !invalid && commit(n, mult === 1 ? String(n) : label);
    if (input.length >= 2) return;
    setInput(input === "0" ? k : input + k);
  }

  return (
    <div className="land:flex land:min-h-0 land:flex-1 land:flex-col">
      <div className="mb-2 flex gap-1.5 land:mb-3" aria-live="polite">
        {Array.from({ length: DARTS_PER_TURN }, (_, i) => {
          const done = i < darts.length;
          const current = i === darts.length;
          return (
            <div
              key={i}
              aria-label={`Rzutka ${i + 1}`}
              className={`flex h-11 min-w-0 flex-1 items-center justify-center rounded-2xl font-mono text-2xl font-bold ring-1 [@media(max-height:700px)]:h-9 md:h-14! land:text-4xl ${
                current
                  ? invalid
                    ? "bg-surface text-red ring-2 ring-red"
                    : "bg-surface ring-2 ring-cream"
                  : done
                    ? "bg-surface-2 ring-line"
                    : "bg-surface/50 text-muted ring-line/50"
              }`}
            >
              {done ? (
                labels[i]
              ) : current ? (
                input ? (
                  <span>
                    {label}
                    {invalid && <span className="ml-1 text-base">✕</span>}
                    {mult > 1 && n !== null && (
                      <span className="ml-1 text-base text-muted">= {n}</span>
                    )}
                  </span>
                ) : mult > 1 ? (
                  <span className="font-sans text-base font-semibold text-cream">
                    {mult === 2 ? "Double…" : "Triple…"}
                  </span>
                ) : (
                  <span className="font-sans text-sm font-medium text-muted">{i + 1}. rzutka</span>
                )
              ) : (
                "–"
              )}
            </div>
          );
        })}
        <div className="flex w-16 shrink-0 flex-col items-center justify-center text-center leading-tight land:w-20">
          <span className="text-xs text-muted">razem</span>
          <span className="font-mono text-xl font-bold tabular-nums">
            {total + (n !== null && !invalid ? n : 0)}
          </span>
        </div>
      </div>
      <div className="mb-2 flex gap-1.5 land:mb-3 land:gap-2">
        <div
          role="radiogroup"
          aria-label="Mnożnik rzutki"
          className="grid flex-[3] grid-cols-3 gap-1.5 land:gap-2"
        >
          {([1, 2, 3] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mult === m}
              onClick={() => setMult(m)}
              className={`h-11 rounded-xl text-lg font-bold transition active:scale-95 max-[380px]:h-10 [@media(max-height:700px)]:h-10 land:h-12! ${
                mult === m ? "bg-cream text-board" : "bg-surface text-muted ring-1 ring-line"
              }`}
            >
              {m === 1 ? "X1" : m === 2 ? "Double" : "Triple"}
            </button>
          ))}
        </div>
        {finish !== null && (
          <button
            type="button"
            onClick={() => commit(finish, dartName(finish))}
            aria-label={`Kończ: ${dartName(finish)}`}
            className="h-11 min-w-0 flex-[1.3] rounded-xl bg-green/15 font-mono text-lg font-bold text-green ring-1 ring-green/40 transition active:scale-95 max-[380px]:h-10 [@media(max-height:700px)]:h-10 land:h-12!"
          >
            🎯 {dartName(finish)}
          </button>
        )}
      </div>
      {invalid && (
        <p role="alert" className="sr-only">
          {label} – takiego pola nie ma
        </p>
      )}
      <KeyGrid
        onPress={press}
        okLabel={last ? "Zapisz" : "Dalej"}
        okAria={last ? "Zapisz serię" : "Następna rzutka"}
        okDisabled={n === null || invalid}
      />
    </div>
  );
}
