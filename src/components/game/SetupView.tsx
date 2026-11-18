"use client";

import { useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { createGame, DEFAULT_TARGET } from "@/lib/game/engine";
import { useLastPlayerNames } from "@/lib/game/storage";
import type { GameState } from "@/lib/game/types";

const TARGETS = [101, 201, 301, 501];
const MAX_NAME = 20;

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function SetupView({ onStart }: { onStart: (g: GameState) => void }) {
  const [lastNames, setLastNames] = useLastPlayerNames();
  const [edited, setEdited] = useState<string[] | null>(null);
  const names = edited ?? lastNames ?? [];
  const setNames = (n: string[]) => setEdited(n);

  const [draft, setDraft] = useState("");
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [customOpen, setCustomOpen] = useState(false);

  const trimmed = draft.trim();
  const duplicate = names.some((n) => n.toLowerCase() === trimmed.toLowerCase());

  function addPlayer() {
    if (!trimmed || duplicate) return;
    setNames([...names, trimmed]);
    setDraft("");
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= names.length) return;
    const next = [...names];
    [next[i], next[j]] = [next[j], next[i]];
    setNames(next);
  }

  function start() {
    setLastNames(names);
    onStart(createGame(names.map((name) => ({ id: newId(), name })), target));
  }

  const validTarget = Number.isInteger(target) && target > 0 && target <= 9999;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <AppHeader title="Nowa gra" backHref="/" />

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
          Gracze {names.length > 0 && `(${names.length})`}
        </h2>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addPlayer();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_NAME))}
            placeholder="Imię gracza"
            autoComplete="off"
            enterKeyHint="done"
            className="min-h-14 min-w-0 flex-1 rounded-2xl bg-surface-2 px-4 text-lg ring-1 ring-line outline-none placeholder:text-muted focus:ring-2 focus:ring-cream"
          />
          <button
            type="submit"
            disabled={!trimmed || duplicate}
            aria-label="Dodaj gracza"
            className="min-h-14 rounded-2xl bg-green px-5 text-lg font-semibold text-white disabled:opacity-40"
          >
            Dodaj
          </button>
        </form>
        {duplicate && trimmed && (
          <p className="mt-2 text-sm text-red">Taki gracz już jest na liście.</p>
        )}

        {names.length > 0 ? (
          <ol className="mt-3 flex flex-col gap-2">
            {names.map((name, i) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-2xl bg-surface py-2 pr-2 pl-4 ring-1 ring-line"
              >
                <span className="w-6 text-center font-mono text-muted">{i + 1}.</span>
                <span className="flex-1 truncate text-lg font-medium">{name}</span>
                <IconButton label={`Przesuń ${name} wyżej`} onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </IconButton>
                <IconButton
                  label={`Przesuń ${name} niżej`}
                  onClick={() => move(i, 1)}
                  disabled={i === names.length - 1}
                >
                  ↓
                </IconButton>
                <IconButton
                  label={`Usuń ${name}`}
                  onClick={() => setNames(names.filter((_, k) => k !== i))}
                >
                  ✕
                </IconButton>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-line p-4 text-center text-muted">
            Dodaj graczy w kolejności rzucania.
          </p>
        )}

        {names.length > 1 && (
          <button
            type="button"
            onClick={() => setNames(shuffle(names))}
            className="mt-3 w-full rounded-2xl py-3 font-semibold text-cream ring-1 ring-line active:bg-surface-2"
          >
            🎲 Losuj kolejność
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
          Gramy do
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {TARGETS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTarget(t);
                setCustomOpen(false);
              }}
              aria-pressed={!customOpen && target === t}
              className="min-h-14 rounded-2xl bg-surface-2 text-xl font-bold ring-1 ring-line aria-pressed:bg-cream aria-pressed:text-board"
            >
              {t}
            </button>
          ))}
        </div>
        {customOpen ? (
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={9999}
            autoFocus
            value={Number.isNaN(target) ? "" : target}
            onChange={(e) => setTarget(e.target.valueAsNumber)}
            aria-label="Własny cel"
            className="mt-2 min-h-14 w-full rounded-2xl bg-surface-2 px-4 text-center text-xl font-bold ring-2 ring-cream outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className="mt-2 w-full py-2 text-muted underline-offset-4 hover:underline"
          >
            Inna liczba…
          </button>
        )}
      </section>

      <div className="sticky bottom-0 mt-auto bg-board pt-2 pb-[env(safe-area-inset-bottom)]">
        <Button onClick={start} disabled={names.length === 0 || !validTarget}>
          {names.length === 0 ? "Dodaj co najmniej 1 gracza" : `Start – do ${validTarget ? target : "…"}`}
        </Button>
      </div>
    </main>
  );
}

function IconButton({
  label,
  children,
  ...props
}: { label: string } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-xl bg-surface-2 text-lg text-ink disabled:opacity-25"
      {...props}
    >
      {children}
    </button>
  );
}
