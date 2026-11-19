"use client";

import { useVoice } from "@/lib/game/storage";
import { say } from "@/lib/speech";

/** Włącznik komunikatu głosowego po każdej serii (na tym telefonie). */
export function VoicePicker() {
  const [on, setOn] = useVoice();

  return (
    <section aria-labelledby="voice-title">
      <h2 id="voice-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        Komunikat głosowy
      </h2>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => {
          setOn(!on);
          if (!on) say("Ania, zostało 41. Teraz rzuca Bartek.");
        }}
        className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 text-left text-lg ring-1 ${
          on ? "bg-surface-2 font-semibold ring-2 ring-cream" : "bg-surface ring-line"
        }`}
      >
        <span className="flex-1">🔊 Czytaj wynik po każdej serii</span>
        <span
          aria-hidden
          className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${on ? "justify-end bg-green" : "justify-start bg-line"}`}
        >
          <span className="size-5 rounded-full bg-white shadow" />
        </span>
      </button>
      <p className="mt-2 text-sm text-muted">
        Np. „Ania, zostało 41. Teraz rzuca Bartek”. Dotyczy tego telefonu – włącz go na tym, który liczy punkty.
      </p>
    </section>
  );
}
