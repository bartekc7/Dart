"use client";

import { useState } from "react";
import { AddMemberForm } from "@/components/league/AddMemberForm";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/Button";
import { createGame, DEFAULT_TARGET } from "@/lib/game/engine";
import { useLastPlayerIds } from "@/lib/game/storage";
import type { GameState } from "@/lib/game/types";
import type { Member } from "@/lib/server/league";

const TARGETS = [101, 201, 301, 501];

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function SetupView({
  members,
  myId,
  onStart,
}: {
  members: Member[];
  myId: string;
  onStart: (g: GameState) => void;
}) {
  const [lastIds, setLastIds] = useLastPlayerIds();
  const [edited, setEdited] = useState<string[] | null>(null);
  const byId = new Map(members.map((m) => [m.id, m]));
  const fallback = lastIds?.filter((id) => byId.has(id)) ?? [];
  const ids = (edited ?? (fallback.length ? fallback : [myId])).filter((id) => byId.has(id));
  const setIds = (n: string[]) => setEdited(n);
  const players = ids.map((id) => byId.get(id)!);
  const others = members.filter((m) => !ids.includes(m.id));
  const [adding, setAdding] = useState(false);

  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [customOpen, setCustomOpen] = useState(false);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    setIds(next);
  }

  function start() {
    setLastIds(ids);
    onStart(createGame(players.map((m) => ({ id: m.id, name: m.name })), target));
  }

  const validTarget = Number.isInteger(target) && target > 0 && target <= 9999;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <AppHeader title="Nowa gra" backHref="/" />

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
          Kolejność rzucania {players.length > 0 && `(${players.length})`}
        </h2>

        {players.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {players.map(({ id, name }, i) => (
              <li
                key={id}
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
                  disabled={i === players.length - 1}
                >
                  ↓
                </IconButton>
                <IconButton label={`Usuń ${name} z gry`} onClick={() => setIds(ids.filter((_, k) => k !== i))}>
                  ✕
                </IconButton>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-4 text-center text-muted">
            Dotknij graczy poniżej w kolejności rzucania.
          </p>
        )}

        {players.length === 1 && (
          <p className="mt-2 text-sm text-muted">
            Gra w pojedynkę nie liczy się do rankingu. Dodaj co najmniej jeszcze jednego gracza.
          </p>
        )}

        {players.length > 1 && (
          <button
            type="button"
            onClick={() => setIds(shuffle(ids))}
            className="mt-3 w-full rounded-2xl py-3 font-semibold text-cream ring-1 ring-line active:bg-surface-2"
          >
            🎲 Losuj kolejność
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
          Dodaj do gry
        </h2>
        <div className="flex flex-wrap gap-2">
          {others.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setIds([...ids, m.id])}
              className="min-h-12 rounded-full bg-surface-2 px-4 text-lg font-medium ring-1 ring-line active:bg-line"
            >
              + {m.name}
            </button>
          ))}
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="min-h-12 rounded-full px-4 font-semibold text-cream border border-dashed border-line active:bg-surface-2"
            >
              + Nowy gracz
            </button>
          )}
        </div>
        {adding && (
          <div className="mt-3">
            <AddMemberForm
              onAdded={(m) => {
                setIds([...ids, m.id]);
                setAdding(false);
              }}
            />
            <p className="mt-1 text-sm text-muted">Nowy gracz zostanie dodany do ligi.</p>
          </div>
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
        <Button onClick={start} disabled={players.length === 0 || !validTarget}>
          {players.length === 0 ? "Wybierz co najmniej 1 gracza" : `Start – do ${validTarget ? target : "…"}`}
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
