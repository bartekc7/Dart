"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  checkout,
  currentPlayer,
  DARTS_PER_TURN,
  dartName,
  formatCheckout,
  formatDarts,
  isLastChance,
  isValidDart,
  lastTurnOf,
  playerStats,
  remainingFor,
} from "@/lib/game/engine";
import type { Duel, DuelProfile } from "@/lib/duel";
import { api, ApiError } from "@/lib/api";
import { accentBackground, activeRowStyle, playerColor } from "@/lib/colors";
import { useDuelEntryMode } from "@/lib/game/storage";
import { useWakeLock } from "@/lib/useWakeLock";
import { useEntryMode } from "@/components/league/LeagueProvider";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { DartPad, NO_DARTS, type PendingDarts } from "@/components/game/DartPad";
import { Keypad } from "@/components/game/Keypad";
import { AchievementToasts } from "@/components/achievements/AchievementToasts";
import type { RecordEvent } from "@/lib/game/records";

type Feedback = { text: string; bad: boolean } | null;

/**
 * Gra 1 na 1 na dwóch telefonach. Klawiatura jest tylko u gracza, który ma
 * kolej – każdy wpisuje swoje rzutki u siebie. Drugi telefon widzi je na żywo.
 */
export function DuelPlay({
  duel,
  meId,
  onDuel,
  records,
}: {
  duel: Duel;
  meId: string;
  onDuel: (d: Duel) => void;
  /** Moje nowe rekordy 1 na 1 w tej grze (dymek po serii). */
  records: RecordEvent[] | null;
}) {
  const router = useRouter();
  const state = duel.state!;
  const leagueMode = useEntryMode();
  const [stored, setStored] = useDuelEntryMode();
  // Każdy telefon wpisuje po swojemu: domyślnie tak jak w jego lidze.
  const mode = stored ?? leagueMode;
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingDarts>(NO_DARTS);
  const [padKey, setPadKey] = useState(0);
  const [firstDartAt, setFirstDartAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  useWakeLock();
  const noAchievements = useMemo(() => ({}), []);

  const profiles = [duel.inviter, duel.rival!];
  const profileOf = (id: string) => profiles.find((p) => p.id === id) as DuelProfile;
  const colorOf = (id: string) => playerColor(profileOf(id).color);
  const player = currentPlayer(state)!;
  const myTurn = player.id === meId;
  const rival = profiles.find((p) => p.id !== meId)!;
  // Rzutki bieżącej serii: moje (z tego telefonu) albo rywala (na żywo z serwera).
  const shown = myTurn ? (mode === "darts" ? pending : NO_DARTS) : duel.live?.playerId === player.id ? duel.live : NO_DARTS;
  const remaining = remainingFor(state, player.id);
  const thrown = shown.darts.reduce((a, b) => a + b, 0);
  const hint = checkout(remaining - thrown, DARTS_PER_TURN - shown.darts.length);
  const last = state.turns.at(-1);
  // Wyrównana runda: zaczynający już zszedł do 0, drugi rzuca ostatnią serię.
  const lastChance = isLastChance(state);
  const finisher = lastChance ? profileOf(state.players.find((p) => p.id !== player.id)!.id) : null;
  const rivalTyping = !!duel.live && duel.live.playerId !== meId && duel.live.darts.length > 0;
  const canUndo = !busy && (pending.darts.length > 0 || (last?.playerId === meId && !rivalTyping));

  /** Rzutki w trakcie serii idą na serwer, żeby rywal widział je od razu. */
  function publish(p: PendingDarts, rev = duel.rev) {
    api(`/api/duels/${duel.id}/live`, { body: { rev, darts: p.darts, labels: p.labels } }).catch(() => {});
  }

  async function submit(score: number, darts?: number[], fields?: string[]) {
    setBusy(true);
    setInput("");
    setPending(NO_DARTS);
    try {
      const { duel: next } = await api<{ duel: Duel }>(`/api/duels/${duel.id}/turn`, {
        body: { scored: score, darts, fields, startedAt: firstDartAt ?? undefined },
      });
      const turn = next.state!.turns.at(-1)!;
      const shownScore = darts && darts.length > 1 ? `${formatDarts(darts)} = ${score}` : String(score);
      setFeedback(turn.bust ? { text: `${shownScore} – za dużo, nie liczy się`, bad: true } : { text: `+${shownScore}, zostało ${remainingFor(next.state!, meId)}`, bad: false });
      vibrate(turn.bust ? [70, 50, 70] : 15);
      onDuel(next);
    } catch (e) {
      setFeedback({ text: (e as ApiError).message, bad: true });
    } finally {
      setBusy(false);
    }
  }

  /** Cofa moją ostatnią rzutkę (także z zapisanej serii, dopóki rywal nie zaczął swojej). */
  async function undo() {
    setInput("");
    setPadKey((k) => k + 1);
    vibrate(15);
    if (pending.darts.length) {
      const next = { darts: pending.darts.slice(0, -1), labels: pending.labels.slice(0, -1) };
      setFeedback({ text: `Cofnięto rzutkę ${pending.labels.at(-1)}`, bad: false });
      setPending(next);
      publish(next);
      return;
    }
    setBusy(true);
    try {
      const { duel: next, turn } = await api<{ duel: Duel; turn: { scored: number; darts?: number[]; fields?: string[] } }>(
        `/api/duels/${duel.id}/undo`,
        { method: "POST" },
      );
      onDuel(next);
      if (mode === "darts" && turn.darts && turn.darts.length > 1) {
        const labels = turn.fields?.length === turn.darts.length ? turn.fields : turn.darts.map(dartName);
        const back = { darts: turn.darts.slice(0, -1), labels: labels.slice(0, -1) };
        setPending(back);
        publish(back, next.rev);
        setFeedback({ text: `Cofnięto rzutkę ${labels.at(-1)}`, bad: false });
      } else {
        setFeedback({ text: `Cofnięto serię ${turn.scored}`, bad: false });
      }
    } catch (e) {
      setFeedback({ text: (e as ApiError).message, bad: true });
    } finally {
      setBusy(false);
    }
  }

  async function cancelGame() {
    try {
      await api(`/api/duels/${duel.id}/cancel`, { method: "POST" });
      router.push("/");
    } catch (e) {
      setFeedback({ text: (e as ApiError).message, bad: true });
    }
  }

  return (
    <main className="screen-fit wide mx-auto flex w-full max-w-xl flex-col gap-3 land:max-w-none land:grid land:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] land:grid-rows-[auto_minmax(0,1fr)] land:gap-x-8 land:gap-y-4">
      <section
        className="shrink-0 rounded-3xl px-3 pt-2 pb-2.5 text-center text-white transition-[background-image] duration-300"
        style={accentBackground(colorOf(player.id))}
      >
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Wróć na start" className="flex size-10 items-center justify-center rounded-full bg-black/20 text-2xl">
            ‹
          </Link>
          <p className="min-w-0 truncate px-2 text-lg">
            {myTurn ? (
              <span className="font-bold">{lastChance ? "Ostatnia szansa!" : "Twoja kolej"}</span>
            ) : (
              <>
                Rzuca <span className="font-bold">{player.name}</span>
              </>
            )}
          </p>
          {myTurn || last?.playerId === meId ? (
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Cofnij moją ostatnią rzutkę"
              className="h-11 shrink-0 whitespace-nowrap rounded-full bg-white/25 px-4 text-base font-bold ring-1 ring-white/40 transition active:scale-95 disabled:opacity-40 max-[380px]:px-3"
            >
              ↶ Cofnij
            </button>
          ) : (
            <span className="w-10" />
          )}
        </div>
        <p className="text-6xl leading-tight font-bold tabular-nums max-[380px]:text-5xl [@media(min-width:48rem)_and_(min-height:36rem)]:text-8xl">
          {myTurn ? remaining : remaining - thrown}
        </p>
        {finisher && (
          <p className="mx-auto mb-1 w-fit rounded-full bg-black/25 px-3 py-0.5 text-sm font-semibold">
            ⚖️{" "}
            {myTurn
              ? `${finisher.name} już na 0 – zejdź i Ty, będzie remis`
              : finisher.id === meId
                ? `Jesteś na 0! ${player.name} rzuca na remis`
                : `${finisher.name} na 0 – ${player.name} rzuca na remis`}
          </p>
        )}
        {hint ? (
          <p className="mx-auto w-fit rounded-full bg-white/20 px-3 font-mono text-lg leading-snug font-bold land:text-2xl">
            <span className="font-sans text-sm font-semibold opacity-90">🎯 {myTurn ? "kończ" : "kończy"}: </span>
            {formatCheckout(hint)}
          </p>
        ) : (
          !feedback && <p className="mt-1 text-sm uppercase tracking-wider opacity-90">
              zostało · gra do {state.settings.target}
              {state.settings.evenRounds && !lastChance && " · wyrównana runda"}
            </p>
        )}
        {feedback && (
          <p role="status" className="mx-auto mt-1 w-fit rounded-full bg-black/25 px-3 py-0.5 text-sm font-medium">
            {feedback.bad ? "✋ " : "✓ "}
            {feedback.text}
          </p>
        )}
      </section>

      <ol aria-label="Wyniki" className="-mx-0.5 grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto p-0.5 land:col-start-1 land:gap-2">
        {state.players.map((p) => {
          const active = p.id === player.id;
          const prev = lastTurnOf(state, p.id);
          const left = remainingFor(state, p.id);
          const stats = playerStats(state, p.id);
          const close = left > 0 && isValidDart(left);
          const look = profileOf(p.id);
          return (
            <li
              key={p.id}
              aria-current={active || undefined}
              className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-1.5 land:py-2 ${active ? "" : close ? "bg-surface ring-2 ring-green/60" : "bg-surface ring-1 ring-line"}`}
              style={active ? activeRowStyle(colorOf(p.id)) : undefined}
            >
              <PlayerDot color={colorOf(p.id)} icon={look.icon} big={active} />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={`truncate land:text-xl ${active ? "font-bold" : "font-medium"}`}>{p.name}</span>
                  {p.id === meId ? (
                    <span className="rounded-md bg-cream px-1.5 text-xs font-extrabold text-board">TY</span>
                  ) : (
                    <span className="text-xs text-muted">📱 swój telefon</span>
                  )}
                </span>
                {prev && (
                  <span className="truncate text-xs text-muted land:text-sm">
                    <span className={prev.bust ? "text-red line-through" : ""}>
                      {prev.darts && prev.darts.length > 1 ? formatDarts(prev.darts) : prev.bust ? prev.scored : `+${prev.scored}`}
                    </span>
                    {" · śr. "}
                    {Math.round(stats.average)}
                  </span>
                )}
              </span>
              <span className="text-right font-mono text-xl font-bold tabular-nums land:text-3xl">{left}</span>
            </li>
          );
        })}
        <li className="pt-1">
          <button
            type="button"
            onClick={() => setConfirmCancel(!confirmCancel)}
            aria-expanded={confirmCancel}
            className="w-full rounded-xl border border-dashed border-line py-2 text-sm font-semibold text-muted active:bg-surface-2"
          >
            ✕ Anuluj grę
          </button>
        </li>
      </ol>

      <div className="shrink-0 land:col-start-2 land:row-span-2 land:row-start-1 land:flex land:min-h-0 land:flex-col">
        {confirmCancel ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-4 ring-1 ring-line">
            <p className="text-lg font-semibold">Anulować grę?</p>
            <p className="text-muted">Gra zniknie u was obu i nie liczy się do bilansu.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmCancel(false)} className="min-h-14 rounded-2xl bg-surface text-lg font-semibold ring-1 ring-line">
                Gramy dalej
              </button>
              <button type="button" onClick={cancelGame} className="min-h-14 rounded-2xl bg-red text-lg font-semibold text-white">
                Anuluj grę
              </button>
            </div>
          </div>
        ) : myTurn ? (
          <div className={busy ? "pointer-events-none opacity-60" : ""}>
            {mode === "darts" ? (
              <DartPad
                key={`${state.turns.length}-${padKey}`}
                remaining={remaining}
                pending={pending}
                onPendingChange={(p) => {
                  if (state.turns.length === 0 && p.darts.length > 0 && firstDartAt === null) setFirstDartAt(Date.now());
                  setPending(p);
                  // Ostatnia rzutka serii od razu zapisuje serię – podgląd czyści serwer.
                  if (p.darts.length > 0 || pending.darts.length > 0) publish(p);
                }}
                onSubmit={submit}
              />
            ) : (
              <Keypad value={input} onChange={setInput} onSubmit={() => submit(Number(input))} remaining={remaining} />
            )}
            <button
              type="button"
              onClick={() => {
                setPending(NO_DARTS);
                if (pending.darts.length) publish(NO_DARTS);
                setStored(mode === "darts" ? "sum" : "darts");
              }}
              className="mt-2 w-full py-1 text-center text-sm text-muted"
            >
              ⇄ {mode === "darts" ? "Wpisuj sumę serii" : "Wpisuj każdą rzutkę (pola 1–20)"}
            </button>
          </div>
        ) : (
          <RivalTurn name={rival.name} color={colorOf(rival.id)} darts={shown} />
        )}
      </div>
      <AchievementToasts earned={noAchievements} records={records} nameOf={(id) => profileOf(id)?.name ?? ""} onlyFor={meId} recordTitle="Nowy rekord 1 na 1" />
    </main>
  );
}

/** Kolej rywala: jego rzutki na żywo zamiast mojej klawiatury. */
function RivalTurn({ name, color, darts }: { name: string; color: string; darts: { darts: number[]; labels: string[] } }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5" aria-live="polite" aria-label={`Rzutki: ${name}`}>
        {Array.from({ length: DARTS_PER_TURN }, (_, i) => {
          const done = i < darts.darts.length;
          const current = i === darts.darts.length;
          return (
            <div
              key={i}
              className={`flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl font-mono text-2xl font-bold ${
                done ? "" : current ? "bg-surface font-sans text-sm font-semibold text-muted ring-2 ring-cream" : "bg-surface/50 text-muted ring-1 ring-line/50"
              }`}
              style={done ? activeRowStyle(color) : undefined}
            >
              {done ? darts.labels[i] : current ? "wpisuje…" : "–"}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-surface px-4 py-6 text-center ring-1 ring-line">
        <p className="text-3xl" aria-hidden>
          📱
        </p>
        <p>
          {name} wpisuje swoje punkty na swoim telefonie.
        </p>
        <p className="text-sm text-muted">Twoja klawiatura wróci, gdy przyjdzie Twoja kolej.</p>
      </div>
    </div>
  );
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}
