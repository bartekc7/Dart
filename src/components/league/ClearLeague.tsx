"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { api } from "@/lib/api";
import type { ClearMode } from "@/lib/server/league";
import { useLeague } from "./LeagueProvider";

const MODES: { value: ClearMode; label: string; hint: string }[] = [
  { value: "games", label: "Tylko gry", hint: "ranking i historia od zera, gracze zostają" },
  { value: "all", label: "Gry i gracze", hint: "zostajesz tylko Ty, link zaproszenia ten sam" },
];

/** Organizator czyści ligę (np. po testach). Wymaga wpisania nazwy ligi. */
export function ClearLeague({ leagueName }: { leagueName: string }) {
  const { refresh } = useLeague();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ClearMode>("games");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const matches = typed.trim().toLowerCase() === leagueName.trim().toLowerCase();

  async function clear() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/league/clear", { body: { mode, leagueName: typed } });
      setDone(mode === "all" ? "Liga wyczyszczona: usunięto gry i graczy." : "Usunięto wszystkie gry.");
      setOpen(false);
      setTyped("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="clear-title">
      <h2 id="clear-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        Wyczyść ligę
      </h2>
      {done && <p className="mb-2 text-sm font-medium text-green">✓ {done}</p>}
      {!open ? (
        <Button variant="secondary" onClick={() => { setOpen(true); setDone(null); }}>
          🧹 Wyczyść ligę…
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-red/40">
          <div role="radiogroup" aria-labelledby="clear-title" className="flex flex-col gap-2">
            {MODES.map((m) => {
              const checked = mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setMode(m.value)}
                  className={`flex min-h-14 flex-col justify-center rounded-2xl px-4 py-2 text-left ring-1 ${
                    checked ? "bg-surface-2 ring-2 ring-cream" : "bg-surface ring-line"
                  }`}
                >
                  <span className={`text-lg ${checked ? "font-semibold" : ""}`}>{m.label}</span>
                  <span className="text-sm text-muted">{m.hint}</span>
                </button>
              );
            })}
          </div>
          <Field
            label={`Wpisz nazwę ligi: ${leagueName}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={leagueName}
          />
          <p className="text-sm text-red">Tego nie da się cofnąć.</p>
          <FormError message={error} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => { setOpen(false); setTyped(""); setError(null); }} disabled={busy}>
              Anuluj
            </Button>
            <Button onClick={clear} disabled={busy || !matches}>
              {busy ? "Czyszczę…" : "Wyczyść"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
