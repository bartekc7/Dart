"use client";

import { useTheme } from "@/lib/game/storage";
import { THEMES } from "@/lib/theme";

export function ThemePicker() {
  const [theme, setTheme] = useTheme();

  return (
    <section aria-labelledby="theme-title">
      <h2 id="theme-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        Motyw
      </h2>
      <div role="radiogroup" aria-labelledby="theme-title" className="flex flex-col gap-2">
        {THEMES.map((t) => {
          const checked = theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setTheme(t.value)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left text-lg ring-1 ${
                checked ? "bg-surface-2 font-semibold ring-2 ring-cream" : "bg-surface ring-line"
              }`}
            >
              <span
                aria-hidden
                className={`flex size-5 items-center justify-center rounded-full ring-2 ${
                  checked ? "ring-cream" : "ring-line"
                }`}
              >
                {checked && <span className="size-2.5 rounded-full bg-cream" />}
              </span>
              <span className="flex-1">{t.label}</span>
              {t.hint && <span className="text-sm font-normal text-muted">{t.hint}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
