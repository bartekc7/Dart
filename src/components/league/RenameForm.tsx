"use client";

import { useState } from "react";
import { FormError } from "@/components/ui/Field";
import { api } from "@/lib/api";
import type { Member } from "@/lib/server/league";
import { useLeague } from "./LeagueProvider";

/** Zmiana nazwy gracza: pole z obecną nazwą, Zapisz i Anuluj. */
export function RenameForm({ member, onDone }: { member: Member; onDone: () => void }) {
  const { refresh } = useLeague();
  const [name, setName] = useState(member.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim().replace(/\s+/g, " ");
  const unchanged = trimmed === member.name;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || unchanged) return onDone();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/members/${member.id}`, { method: "PATCH", body: { name: trimmed } });
      await refresh();
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value.slice(0, 20));
          setError(null);
        }}
        autoFocus
        aria-label="Nowa nazwa"
        autoComplete="off"
        enterKeyHint="done"
        className="min-h-14 w-full min-w-0 rounded-2xl bg-surface-2 px-4 text-lg ring-2 ring-cream outline-none placeholder:text-muted"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onDone}
          disabled={busy}
          className="min-h-12 rounded-2xl bg-surface-2 text-lg font-semibold ring-1 ring-line"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={!trimmed || busy}
          className="min-h-12 rounded-2xl bg-green text-lg font-semibold text-white disabled:opacity-40"
        >
          Zapisz
        </button>
      </div>
      <FormError message={error} />
    </form>
  );
}
