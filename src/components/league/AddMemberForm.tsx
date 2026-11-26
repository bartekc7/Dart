"use client";

import { useState } from "react";
import { FormError } from "@/components/ui/Field";
import { LookPicker } from "@/components/ui/LookPicker";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { api } from "@/lib/api";
import { playerColor } from "@/lib/colors";
import { looksOf, parseLook, suggestedLook, type LookKey } from "@/lib/looks";
import type { Member } from "@/lib/server/league";
import { useLeague } from "./LeagueProvider";

/** Dodanie gracza bez telefonu (np. gościa). Każdy członek ligi może dodać. */
export function AddMemberForm({ onAdded }: { onAdded?: (m: Member) => void }) {
  const { state, refresh } = useLeague();
  const all = state.status === "ready" ? [...state.data.members, ...state.data.inactive] : [];
  const taken = looksOf(all);
  const [name, setName] = useState("");
  /** Wybrany znak; null = domyślny (pierwszy wolny kolor), jak dotąd. */
  const [look, setLook] = useState<LookKey | null>(null);
  const [picking, setPicking] = useState(false);
  const shown = look && !taken.includes(look) ? look : suggestedLook(taken);
  const shownLook = parseLook(shown);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const { member } = await api<{ member: Member }>("/api/members", {
        body: look ? { name: trimmed, look } : { name: trimmed },
      });
      await refresh();
      setName("");
      setLook(null);
      setPicking(false);
      onAdded?.(member);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          aria-expanded={picking}
          aria-label="Kolor albo ikonka gracza"
          className={`flex min-h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-2 ring-1 ${picking ? "ring-2 ring-cream" : "ring-line"}`}
        >
          <PlayerDot color={playerColor(shownLook?.color ?? -1)} icon={shownLook?.icon} big />
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder="Imię gracza"
          aria-label="Imię nowego gracza"
          autoComplete="off"
          enterKeyHint="done"
          className="min-h-14 min-w-0 flex-1 rounded-2xl bg-surface-2 px-4 text-lg ring-1 ring-line outline-none placeholder:text-muted focus:ring-2 focus:ring-cream"
        />
        <button
          type="submit"
          disabled={!trimmed || busy}
          className="min-h-14 rounded-2xl bg-green px-5 text-lg font-semibold text-white disabled:opacity-40"
        >
          Dodaj
        </button>
      </div>
      {picking && (
        <LookPicker
          value={shown}
          taken={taken}
          onChange={(k) => {
            setLook(k);
            setPicking(false);
            setError(null);
          }}
        />
      )}
      <FormError message={error} />
    </form>
  );
}
