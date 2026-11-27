"use client";

import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import type { Duel } from "@/lib/duel";

/** Karta zaproszenia u rywala: kto zaprasza, do ilu, kto zaczyna, „Gramy!” / „Nie teraz”. */
export function InviteCard({
  duel,
  busy,
  error,
  onAccept,
  onDecline,
}: {
  duel: Duel;
  busy?: boolean;
  error?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { inviter, rival } = duel;
  const starts = duel.starterId === inviter.id ? inviter.name : "Ty";
  const played = rival ? (duel.balance[rival.id] ?? 0) + (duel.balance[inviter.id] ?? 0) : 0;
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-2xl ring-1 ring-line">
      <div className="rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#1d4ed8] px-4 py-5 text-center text-white">
        <p className="text-4xl" aria-hidden>
          ⚔️
        </p>
        <p className="mt-1 text-2xl">
          <strong>{inviter.name}</strong> zaprasza Cię
        </p>
        <p className="mt-1 opacity-90">
          1 na 1 · do {duel.target} · zaczyna {starts}
        </p>
        {rival && played > 0 && (
          <p className="mt-1 text-sm opacity-80">
            Wasz bilans: {duel.balance[rival.id] ?? 0} : {duel.balance[inviter.id] ?? 0}
          </p>
        )}
      </div>
      <FormError message={error ?? null} />
      <div className="grid grid-cols-[1fr_1.6fr] gap-2">
        <Button variant="secondary" onClick={onDecline} disabled={busy}>
          Nie teraz
        </Button>
        <Button onClick={onAccept} disabled={busy} className="bg-green! shadow-green/20">
          ✓ Gramy!
        </Button>
      </div>
    </div>
  );
}
