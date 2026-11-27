"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { fmt, seriesWord } from "@/components/game/FinalStandings";
import { api, ApiError } from "@/lib/api";
import { accentBackground, playerColor } from "@/lib/colors";
import type { Duel, DuelProfile } from "@/lib/duel";
import { formatDuration, gameDuration, playerStats } from "@/lib/game/engine";
import type { GameState, PlayerId } from "@/lib/game/types";

/** Wyniki 1 na 1: kto wygrał, bilans pary, porównanie i rewanż. */
export function DuelResults({ duel, meId, onDuel }: { duel: Duel; meId: string; onDuel: (d: Duel) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = duel.state!;
  const me = duel.inviter.id === meId ? duel.inviter : duel.rival!;
  const rival = duel.inviter.id === meId ? duel.rival! : duel.inviter;
  const won = duel.winnerId === meId;
  const winner = won ? me : rival;
  const duration = gameDuration(state);
  const series = state.turns.filter((t) => t.playerId === duel.winnerId).length;
  const lastIsMine = state.turns.at(-1)?.playerId === meId;

  async function rematch() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>(`/api/duels/${duel.id}/rematch`, { method: "POST" });
      router.push(`/1na1/${id}`);
    } catch (e) {
      setError((e as ApiError).message);
      setBusy(false);
    }
  }

  async function undo() {
    setBusy(true);
    setError(null);
    try {
      const { duel: next } = await api<{ duel: Duel }>(`/api/duels/${duel.id}/undo`, { method: "POST" });
      onDuel(next);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4">
      <section className="mt-2 rounded-3xl px-4 py-6 text-center text-white" style={accentBackground(playerColor(winner.color))}>
        <p className="text-5xl" aria-hidden>
          {won ? "🏆" : "🎯"}
        </p>
        <p className="mt-1 text-2xl font-extrabold">{won ? "Wygrywasz!" : `Wygrywa ${rival.name}`}</p>
        <p className="opacity-90">
          do {state.settings.target} · {series} {seriesWord(series)}
          {duration !== null && ` · czas ${formatDuration(duration)}`}
        </p>
      </section>

      <section className="rounded-3xl bg-surface p-4 ring-1 ring-line" aria-label="Bilans">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
          <Name p={me} />
          <span className="text-sm text-muted">bilans</span>
          <Name p={rival} />
          <span className={`font-mono text-5xl font-bold ${won ? "text-green" : ""}`}>{duel.balance[me.id] ?? 0}</span>
          <span className="font-mono text-4xl text-muted">:</span>
          <span className={`font-mono text-5xl font-bold ${won ? "" : "text-green"}`}>{duel.balance[rival.id] ?? 0}</span>
        </div>
      </section>

      <section className="rounded-3xl bg-surface px-4 py-1 ring-1 ring-line" aria-label="Porównanie">
        <Compare label="średnia / 3 rz." a={fmt(playerStats(state, me.id).average)} b={fmt(playerStats(state, rival.id).average)} />
        <Compare label="najlepsza seria" a={bestSeries(state, me.id)} b={bestSeries(state, rival.id)} />
        <Compare label="przekroczenia" a={String(playerStats(state, me.id).busts)} b={String(playerStats(state, rival.id).busts)} last />
      </section>

      <FormError message={error} />
      <div className="mt-auto flex flex-col gap-2">
        {duel.rematchId ? (
          <ButtonLink href={`/1na1/${duel.rematchId}`}>🔁 Rewanż ›</ButtonLink>
        ) : (
          <div className="grid grid-cols-[1fr_1.6fr] gap-2">
            <ButtonLink href="/" variant="secondary">
              Koniec
            </ButtonLink>
            <Button onClick={rematch} disabled={busy}>
              🔁 Rewanż
            </Button>
          </div>
        )}
        {lastIsMine && !duel.rematchId && (
          <button type="button" onClick={undo} disabled={busy} className="py-2 text-sm text-muted disabled:opacity-40">
            ↶ Pomyłka? Cofnij ostatnią serię
          </button>
        )}
      </div>
    </main>
  );
}

function Name({ p }: { p: DuelProfile }) {
  return (
    <span className="flex min-w-0 items-center justify-center gap-1.5 font-semibold">
      <PlayerDot color={playerColor(p.color)} icon={p.icon} />
      <span className="truncate">{p.name}</span>
    </span>
  );
}

function Compare({ label, a, b, last }: { label: string; a: string; b: string; last?: boolean }) {
  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 ${last ? "" : "border-b border-line"}`}>
      <span className="font-bold">{a}</span>
      <span className="text-center text-sm text-muted">{label}</span>
      <span className="text-right font-bold">{b}</span>
    </div>
  );
}

/** Najlepsza zaliczona seria: pola (np. „T20 T20 T19”), gdy wpisywano rzutki, inaczej suma. */
function bestSeries(state: GameState, id: PlayerId): string {
  const best = state.turns
    .filter((t) => t.playerId === id && !t.bust)
    .reduce<GameState["turns"][number] | null>((m, t) => (!m || t.scored > m.scored ? t : m), null);
  if (!best) return "–";
  return best.fields && best.fields.length > 1 ? `${best.fields.join(" ")} (${best.scored})` : String(best.scored);
}
