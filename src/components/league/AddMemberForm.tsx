"use client";

import { useState } from "react";
import { FormError } from "@/components/ui/Field";
import { api } from "@/lib/api";
import type { Member } from "@/lib/server/league";
import { useLeague } from "./LeagueProvider";

/** Dodanie gracza bez telefonu (np. gościa). Każdy członek ligi może dodać. */
export function AddMemberForm({ onAdded }: { onAdded?: (m: Member) => void }) {
  const { refresh } = useLeague();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const { member } = await api<{ member: Member }>("/api/members", { body: { name: trimmed } });
      await refresh();
      setName("");
      onAdded?.(member);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
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
      <FormError message={error} />
    </form>
  );
}
