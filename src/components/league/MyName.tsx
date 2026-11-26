"use client";

import { useState } from "react";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { playerColor } from "@/lib/colors";
import { useLeague } from "./LeagueProvider";
import { RenameForm } from "./RenameForm";

/** Opcje › Twoja nazwa: każdy gracz ligi może zmienić swoją nazwę. */
export function MyName() {
  const { state } = useLeague();
  const [editing, setEditing] = useState(false);
  if (state.status !== "ready" || !state.data.me) return null;
  const { member } = state.data.me;

  return (
    <section aria-labelledby="my-name-title">
      <h2 id="my-name-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        Twoja nazwa
      </h2>
      {editing ? (
        <RenameForm member={member} onDone={() => setEditing(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-surface px-4 text-left ring-1 ring-line active:bg-surface-2"
        >
          <PlayerDot color={playerColor(member.color)} />
          <span className="min-w-0 flex-1 truncate text-lg font-semibold">{member.name}</span>
          <span className="shrink-0 font-semibold text-cream">✏️ Zmień</span>
        </button>
      )}
      <p className="mt-2 text-sm text-muted">Nazwa musi być inna niż pozostałych graczy w lidze. Wyniki zostają.</p>
    </section>
  );
}
