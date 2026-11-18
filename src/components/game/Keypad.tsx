"use client";

import { MAX_SCORE_PER_TURN } from "@/lib/game/engine";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"] as const;

/** Klawiatura do wpisania sumy punktów z serii (0–180). */
export function Keypad({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const n = value === "" ? null : Number(value);
  const tooHigh = n !== null && n > MAX_SCORE_PER_TURN;

  function press(k: (typeof KEYS)[number]) {
    if (k === "⌫") return onChange(value.slice(0, -1));
    if (k === "OK") return !tooHigh && n !== null && onSubmit();
    if (value.length >= 3) return;
    onChange(value === "0" ? k : value + k);
  }

  return (
    <div>
      <div
        aria-live="polite"
        className={`mb-2 flex h-11 items-center justify-center rounded-2xl bg-surface font-mono text-3xl font-bold ring-1 ${
          tooHigh ? "text-red ring-red" : "ring-line"
        }`}
      >
        {value === "" ? (
          <span className="font-sans text-lg font-medium text-muted">Wpisz punkty serii</span>
        ) : tooHigh ? (
          <span className="font-sans text-lg font-semibold">{value} – maks. 180</span>
        ) : (
          value
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => {
          const isOk = k === "OK";
          const disabled = isOk && (n === null || tooHigh);
          return (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              disabled={disabled}
              aria-label={k === "⌫" ? "Usuń cyfrę" : isOk ? "Zapisz serię" : k}
              className={`h-12 rounded-2xl text-2xl max-[380px]:h-11 font-semibold transition active:scale-95 disabled:opacity-40 ${
                isOk
                  ? "bg-green text-white"
                  : k === "⌫"
                    ? "bg-surface-2 text-muted ring-1 ring-line"
                    : "bg-surface-2 ring-1 ring-line"
              }`}
            >
              {isOk ? "Zapisz" : k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
