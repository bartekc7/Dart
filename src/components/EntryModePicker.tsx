"use client";

import { useEntryMode, type EntryMode } from "@/lib/game/storage";

const MODES: { value: EntryMode; label: string; hint: string }[] = [
  { value: "sum", label: "Suma serii", hint: "jedna liczba za 3 rzutki" },
  { value: "darts", label: "Każda rzutka osobno", hint: "3 liczby" },
];

/** Wybór sposobu wpisywania punktów na tym telefonie. */
export function EntryModePicker() {
  const [mode, setMode] = useEntryMode();

  return (
    <section aria-labelledby="entry-title">
      <h2 id="entry-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        Wpisywanie punktów
      </h2>
      <div role="radiogroup" aria-labelledby="entry-title" className="flex flex-col gap-2">
        {MODES.map((m) => {
          const checked = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setMode(m.value)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left text-lg ring-1 ${
                checked ? "bg-surface-2 font-semibold ring-2 ring-cream" : "bg-surface ring-line"
              }`}
            >
              <span
                aria-hidden
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ring-2 ${
                  checked ? "ring-cream" : "ring-line"
                }`}
              >
                {checked && <span className="size-2.5 rounded-full bg-cream" />}
              </span>
              <span className="flex-1">{m.label}</span>
              <span className="text-sm font-normal text-muted">{m.hint}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm text-muted">
        Dotyczy tego telefonu. Przekroczenie liczymy zawsze po sumie serii.
      </p>
    </section>
  );
}
