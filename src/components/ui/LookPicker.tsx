"use client";

import { PLAYER_COLORS } from "@/lib/colors";
import { lookLabel, PLAYER_ICONS, type LookKey } from "@/lib/looks";

/**
 * Wybór znaku gracza: jeden z kolorów ALBO jedna z ikonek. Zajęte przez
 * innych graczy ligi są wyszarzone i nie da się ich wybrać.
 */
export function LookPicker({
  value,
  onChange,
  taken,
}: {
  value: LookKey;
  onChange: (key: LookKey) => void;
  taken: Iterable<LookKey>;
}) {
  const busy = new Set(taken);
  const item = (key: LookKey, content: React.ReactNode, round: boolean) => {
    const selected = key === value;
    const disabled = busy.has(key) && !selected;
    return (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={`${lookLabel(key)}${disabled ? " (zajęte)" : ""}`}
        title={disabled ? `${lookLabel(key)} – zajęte` : lookLabel(key)}
        className={`relative flex aspect-square items-center justify-center rounded-xl text-2xl leading-none transition ${
          selected ? "bg-surface-2 ring-2 ring-cream" : "active:bg-surface-2"
        } ${disabled ? "opacity-25 grayscale" : ""}`}
      >
        {round ? content : <span aria-hidden>{content}</span>}
        {disabled && (
          <span aria-hidden className="absolute inset-x-2 top-1/2 h-0.5 -rotate-45 rounded bg-muted" />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-10 gap-0.5" role="group" aria-label="Kolor">
        {PLAYER_COLORS.map((c, i) =>
          item(`color:${i}`, <span aria-hidden className="size-6 rounded-full" style={{ backgroundColor: c }} />, true),
        )}
      </div>
      <p className="text-center text-xs text-muted">albo ikonka</p>
      <div className="grid grid-cols-10 gap-0.5" role="group" aria-label="Ikonka">
        {PLAYER_ICONS.map((x) => item(`icon:${x.icon}`, x.icon, false))}
      </div>
    </div>
  );
}
