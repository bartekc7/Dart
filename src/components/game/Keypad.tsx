"use client";

import { MAX_SCORE_PER_TURN } from "@/lib/game/engine";

export const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"] as const;
export type Key = (typeof KEYS)[number];

/** Najczęstsze sumy serii w darcie – jedno dotknięcie zamiast trzech. */
const QUICK = [26, 41, 45, 60, 100];

/** Klawiatura do wpisania sumy punktów z serii (0–180). */
export function Keypad({
  value,
  onChange,
  onSubmit,
  remaining,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  /** Ile zostało graczowi: skrót „równo”, gdy da się skończyć jedną serią. */
  remaining?: number;
}) {
  const exact = remaining !== undefined && remaining > 0 && remaining <= MAX_SCORE_PER_TURN ? remaining : null;
  const quick = QUICK.filter((q) => q !== exact);
  const n = value === "" ? null : Number(value);
  const tooHigh = n !== null && n > MAX_SCORE_PER_TURN;

  function press(k: Key) {
    if (k === "⌫") return onChange(value.slice(0, -1));
    if (k === "OK") return !tooHigh && n !== null && onSubmit();
    if (value.length >= 3) return;
    onChange(value === "0" ? k : value + k);
  }

  return (
    <div className="land:flex land:min-h-0 land:flex-1 land:flex-col">
      <div
        aria-live="polite"
        className={`mb-2 flex h-11 [@media(max-height:700px)]:h-9 land:h-16! land:text-5xl items-center justify-center rounded-2xl bg-surface font-mono text-3xl font-bold ring-1 ${
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
      <div className="mb-2 flex gap-1.5 land:mb-3 land:gap-2" aria-label="Szybki wybór">
        {exact !== null && (
          <QuickKey active={value === String(exact)} onClick={() => onChange(String(exact))} highlight>
            🎯 {exact}
          </QuickKey>
        )}
        {quick.slice(0, exact !== null ? 4 : 5).map((q) => (
          <QuickKey key={q} active={value === String(q)} onClick={() => onChange(String(q))}>
            {q}
          </QuickKey>
        ))}
      </div>
      <KeyGrid onPress={press} okLabel="Zapisz" okAria="Zapisz serię" okDisabled={n === null || tooHigh} />
    </div>
  );
}

export function QuickKey({
  children,
  onClick,
  active,
  highlight,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 min-w-0 flex-1 rounded-xl font-mono text-lg font-bold tabular-nums transition active:scale-95 max-[380px]:h-9 [@media(max-height:700px)]:h-9 land:h-12! land:text-xl ${
        active
          ? "bg-cream text-board"
          : highlight
            ? "bg-green/15 text-green ring-1 ring-green/40"
            : "bg-surface text-muted ring-1 ring-line"
      } ${highlight ? "flex-[1.4]" : ""}`}
    >
      {children}
    </button>
  );
}

/** Klawiatura cyfr z kasowaniem i przyciskiem zatwierdzenia. */
export function KeyGrid({
  onPress,
  okLabel,
  okAria,
  okDisabled,
}: {
  onPress: (k: Key) => void;
  okLabel: string;
  okAria: string;
  okDisabled: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 land:max-h-[26rem] land:flex-1 land:auto-rows-fr land:gap-3">
      {KEYS.map((k) => {
        const isOk = k === "OK";
        return (
          <button
            key={k}
            type="button"
            onClick={() => onPress(k)}
            disabled={isOk && okDisabled}
            aria-label={k === "⌫" ? "Usuń cyfrę" : isOk ? okAria : k}
            className={`h-12 rounded-2xl text-2xl max-[380px]:h-11 [@media(max-height:700px)]:h-10 md:h-14 font-semibold transition active:scale-95 disabled:opacity-40 land:h-auto! land:min-h-9 ${isOk ? "" : "land:text-3xl"} ${
              isOk
                ? "bg-green text-white"
                : k === "⌫"
                  ? "bg-surface-2 text-muted ring-1 ring-line"
                  : "bg-surface-2 ring-1 ring-line"
            }`}
          >
            {isOk ? okLabel : k}
          </button>
        );
      })}
    </div>
  );
}
