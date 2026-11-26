"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { api } from "@/lib/api";
import type { LookKey } from "@/lib/looks";
import { LookSection } from "./JoinLeague";
import { useLeague } from "./LeagueProvider";

export function CreateLeagueForm() {
  const router = useRouter();
  const { state, refresh } = useLeague();
  const [leagueName, setLeagueName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [look, setLook] = useState<LookKey>("color:0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current = state.status === "ready" ? state.data.me : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/leagues", { body: { leagueName, playerName, look } });
      await refresh();
      router.push("/liga");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
      <Field
        label="Nazwa ligi"
        placeholder="np. Dart w biurze"
        value={leagueName}
        maxLength={40}
        onChange={(e) => setLeagueName(e.target.value)}
        autoFocus
      />
      <Field
        label="Twoja nazwa"
        placeholder="np. Bartek"
        value={playerName}
        maxLength={20}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <LookSection value={look} taken={[]} onChange={setLook} />
      <p className="text-sm text-muted">
        Zostaniesz organizatorem ligi. Potem dostaniesz link i kod QR, które wyślesz znajomym.
      </p>
      {current && (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
          Ten telefon jest teraz w lidze „{current.league.name}”. Założenie nowej ligi przeniesie go
          do niej.
        </p>
      )}
      <FormError message={error} />
      <Button type="submit" disabled={busy || !leagueName.trim() || !playerName.trim()} className="mt-auto">
        {busy ? "Zakładam…" : "Załóż ligę"}
      </Button>
    </form>
  );
}
