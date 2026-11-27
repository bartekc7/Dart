"use client";

import { useState } from "react";
import { checkout, DARTS_PER_TURN, dartName, fieldValue, type Mult } from "@/lib/game/engine";
import { boardKeyCenter, finishingKeys } from "@/lib/game/board";
import { useDartInput } from "@/lib/game/storage";
import { DartBoard } from "./DartBoard";

/** Rzutki już wpisane w bieżącej serii (punkty i pola, np. 60 / „T20”). */
export interface PendingDarts {
  darts: number[];
  labels: string[];
}

export const NO_DARTS: PendingDarts = { darts: [], labels: [] };

const FIELDS = Array.from({ length: 20 }, (_, i) => i + 1);
const PREFIX = { 1: "", 2: "D", 3: "T" } as const;

/**
 * Wpisywanie serii rzutka po rzutce: jedno dotknięcie pola zapisuje rzutkę
 * (z Double/Triple – dwa dotknięcia). Seria kończy się po trzeciej rzutce
 * albo wcześniej, gdy gracz trafi równo lub przekroczy cel (dalej nie rzuca).
 * Pomyłkę poprawia „↶ Cofnij” u góry ekranu.
 * Zamiast przycisków urządzenie może mieć klikalną tarczę (Opcje › Wpisywanie rzutek).
 * Wpisane rzutki trzyma ekran gry, żeby „Cofnij” i podpowiedź je widziały.
 */
export function DartPad({
  remaining,
  pending,
  onPendingChange,
  onSubmit,
}: {
  remaining: number;
  pending: PendingDarts;
  onPendingChange: (p: PendingDarts) => void;
  onSubmit: (score: number, darts: number[], fields: string[]) => void;
}) {
  const { darts, labels } = pending;
  const [mult, setMult] = useState<Mult>(1);
  const [input] = useDartInput();
  // Miejsca kliknięć na tarczy (kropki z numerem rzutki); pola bez miejsca – środek pola.
  const [spots, setSpots] = useState<{ key: string; x: number; y: number }[]>([]);

  const total = darts.reduce((a, b) => a + b, 0);
  // Ile brakuje do równego: pola, którymi da się skończyć, świecą na zielono.
  const left = remaining - total;
  const finishKeys = finishingKeys(left);

  /** Zapis pola rzutki (T20, D8, 5, D25 = bull, 0 = pudło) – trafia też do statystyk tarczy. */
  function commit(v: number, field = dartName(v), spot?: [number, number]) {
    const next = [...darts, v];
    if (spot) setSpots([...spots.slice(0, darts.length), { key: field, x: spot[0], y: spot[1] }]);
    const sum = total + v;
    setMult(1);
    vibrate(10);
    if (next.length === DARTS_PER_TURN || sum >= remaining) {
      onPendingChange(NO_DARTS);
      onSubmit(sum, next, [...labels, field]);
    } else {
      onPendingChange({ darts: next, labels: [...labels, field] });
    }
  }

  if (input === null) return null;
  const board = input === "board";

  /** Double/Triple działa na jedną rzutkę; ponowne dotknięcie wyłącza. */
  function toggle(m: 2 | 3) {
    setMult(mult === m ? 1 : m);
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
              className={`flex h-10 min-w-0 flex-1 items-center justify-center rounded-2xl font-mono text-2xl font-bold ring-1 [@media(max-height:700px)]:h-9 md:h-14! land:text-4xl ${
                current ? "bg-surface ring-2 ring-cream" : done ? "bg-surface-2 ring-line" : "bg-surface/50 text-muted ring-line/50"
              }`}
            >
              {done ? (
                labels[i]
              ) : current ? (
                <span className={`font-sans font-semibold ${mult > 1 ? "text-base text-cream" : "text-sm text-muted"}`}>
                  {mult === 2 ? "Double…" : mult === 3 ? "Triple…" : `${i + 1}. rzutka`}
                </span>
              ) : (
                "–"
              )}
            </div>
          );
        })}
        <div
          className={`flex w-16 shrink-0 flex-col items-center justify-center text-center leading-tight land:w-20 ${board ? "max-[420px]:hidden" : ""}`}
        >
          <span className="text-xs text-muted">razem</span>
          <span className="font-mono text-xl font-bold tabular-nums">{total}</span>
        </div>
        {board && (
          <button
            type="button"
            onClick={() => commit(0, "0")}
            className="w-20 shrink-0 rounded-2xl bg-surface font-semibold text-muted ring-1 ring-line transition active:scale-95 land:w-28 land:text-lg"
          >
            ✕ Pudło
          </button>
        )}
      </div>

      {board ? (
        <DartBoard
          finish={finishKeys}
          hint={finishKeys.length ? null : (checkout(left, DARTS_PER_TURN - darts.length)?.[0] ?? null)}
          marks={labels.flatMap((k, i) => {
            if (k === "0") return [];
            const s = spots[i];
            const c = s && s.key === k ? [s.x, s.y] : boardKeyCenter(k);
            return c ? [[c[0], c[1], i + 1] as [number, number, number]] : [];
          })}
          onPick={(key, x, y) => commit(fieldValue(key) ?? 0, key, key === "0" ? undefined : [x, y])}
        />
      ) : (
      <>

      {/* Pięć przycisków w rzędzie, równo z polami 1–20 poniżej. */}
      <div className="mb-1.5 grid grid-cols-5 gap-1.5 land:mb-2 land:gap-2">
        {([2, 3] as const).map((m) => (
          <FieldKey
            key={m}
            small
            pressed={mult === m}
            finish={mult !== m && FIELDS.some((f) => f * m === left)}
            onClick={() => toggle(m)}
            label={m === 2 ? "Double" : "Triple"}
          >
            {m === 2 ? "Double" : "Triple"}
          </FieldKey>
        ))}
        <FieldKey small muted onClick={() => commit(0, "0")} disabled={mult > 1} label="Pudło, 0 punktów">
          Pudło
        </FieldKey>
        <FieldKey small onClick={() => commit(25, "25")} disabled={mult > 1} finish={mult === 1 && left === 25} label="25">
          25
        </FieldKey>
        <FieldKey small onClick={() => commit(50, "D25")} finish={left === 50} label="Bull, 50 punktów">
          <span className="flex flex-col">Bull<span className="text-xs font-semibold whitespace-nowrap opacity-70">50 pkt</span></span>
        </FieldKey>
      </div>

      <div
        role="group"
        aria-label="Pole trafienia"
        className="grid grid-cols-5 gap-1.5 land:max-h-[26rem] land:flex-1 land:auto-rows-fr land:gap-2"
      >
        {FIELDS.map((f) => (
          <FieldKey
            key={f}
            onClick={() => commit(f * mult, `${PREFIX[mult]}${f}`)}
            accent={mult > 1}
            finish={f * mult === left}
            label={`${PREFIX[mult]}${f}`}
          >
            {mult > 1 && <span className="text-[0.7em] opacity-70">{PREFIX[mult]}</span>}
            {f}
          </FieldKey>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

function FieldKey({
  children,
  onClick,
  disabled,
  small,
  muted,
  accent,
  pressed,
  finish,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  small?: boolean;
  muted?: boolean;
  accent?: boolean;
  pressed?: boolean;
  /** Tym polem gracz kończy równo – podświetlone na zielono. */
  finish?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      className={`min-w-0 rounded-2xl font-bold tabular-nums transition active:scale-95 disabled:opacity-30 land:h-auto! land:min-h-9 ${
        small
          ? "h-14 font-sans text-base leading-tight max-[380px]:h-12 max-[380px]:text-sm [@media(max-height:700px)]:h-11 md:h-16 land:text-xl"
          : "h-12 font-mono text-2xl max-[380px]:h-11 [@media(max-height:700px)]:h-10 md:h-14 land:text-3xl"
      } ${
        pressed
          ? "bg-cream text-board"
          : finish
            ? "bg-green/15 text-green ring-2 ring-green/60"
            : accent
              ? "bg-surface-2 text-cream ring-2 ring-cream/40"
              : muted
                ? "bg-surface text-muted ring-1 ring-line"
                : "bg-surface-2 ring-1 ring-line"
      }`}
    >
      {children}
    </button>
  );
}

function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}
