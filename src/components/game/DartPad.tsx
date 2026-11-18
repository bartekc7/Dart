"use client";

import { useState } from "react";
import { DARTS_PER_TURN, isValidDart } from "@/lib/game/engine";
import { KeyGrid, QuickKey, type Key } from "./Keypad";

/** Najczęstsze pojedyncze rzuty: pudło (0), 20, potrójna 20, środek. */
const QUICK = [0, 20, 60, 25, 50];

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
  const [input, setInput] = useState("");

  const total = darts.reduce((a, b) => a + b, 0);
  const left = remaining - total;
  const n = input === "" ? null : Number(input);
  const invalid = n !== null && !isValidDart(n);
  // Ostatnia rzutka serii: trzecia albo ta, która kończy lub przekracza cel.
  const last = darts.length === DARTS_PER_TURN - 1 || (n !== null && !invalid && total + n >= remaining);
  // Rzutka, którą da się skończyć równo (np. zostało 16 → 16).
  const exact = left > 0 && isValidDart(left) ? left : null;

  function commit(v: number) {
    const next = [...darts, v];
    const sum = total + v;
    setInput("");
    if (next.length === DARTS_PER_TURN || sum >= remaining) {
      setDarts([]);
      onSubmit(sum, next);
    } else {
      setDarts(next);
    }
  }

  function press(k: Key) {
    if (k === "⌫") {
      if (input) return setInput(input.slice(0, -1));
      // Puste pole: wracamy do poprzedniej rzutki, żeby ją poprawić.
      if (darts.length) {
        setInput(String(darts.at(-1)));
        setDarts(darts.slice(0, -1));
      }
      return;
    }
    if (k === "OK") return n !== null && !invalid && commit(n);
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
              {done ? darts[i] : current ? input || <span className="font-sans text-sm font-medium text-muted">{i + 1}. rzutka</span> : "–"}
            </div>
          );
        })}
        <div className="flex w-16 shrink-0 flex-col items-center justify-center text-center leading-tight land:w-20">
          <span className="text-xs text-muted">razem</span>
          <span className="font-mono text-xl font-bold tabular-nums">{total + (n !== null && !invalid ? n : 0)}</span>
        </div>
      </div>
      {invalid ? (
        <p role="alert" className="mb-2 flex h-10 items-center justify-center rounded-xl bg-red/10 text-sm font-semibold text-red max-[380px]:h-9 [@media(max-height:700px)]:h-9 land:h-12!">
          {input} – nie da się jedną rzutką
        </p>
      ) : (
        <div className="mb-2 flex gap-1.5 land:mb-3 land:gap-2" aria-label="Szybki wybór">
          {exact !== null && (
            <QuickKey active={false} onClick={() => commit(exact)} highlight>
              🎯 {exact}
            </QuickKey>
          )}
          {QUICK.filter((q) => q !== exact)
            .slice(0, exact !== null ? 4 : 5)
            .map((q) => (
              <QuickKey key={q} active={false} onClick={() => commit(q)}>
                {q}
              </QuickKey>
            ))}
        </div>
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
