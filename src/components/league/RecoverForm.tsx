"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { useLeague } from "./LeagueProvider";

/** Organizator na nowym telefonie wpisuje kod odzyskiwania i wraca do swojej ligi. */
export function RecoverForm() {
  const router = useRouter();
  const { refresh } = useLeague();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/recover", { body: { code } });
      await refresh();
      router.push("/liga");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
      <p className="text-muted">
        Zgubiłeś telefon albo wyczyściłeś przeglądarkę? Wpisz kod odzyskiwania, który zapisałeś w panelu ligi.
        Ten telefon stanie się Twoim, a stary zostanie odłączony.
      </p>
      <Field
        label="Kod odzyskiwania"
        placeholder="XXXX-XXXX-XXXX"
        value={code}
        maxLength={20}
        autoCapitalize="characters"
        spellCheck={false}
        onChange={(e) => setCode(e.target.value)}
        className="min-h-14 w-full min-w-0 rounded-2xl bg-surface-2 px-4 font-mono text-xl tracking-wider uppercase ring-1 ring-line outline-none placeholder:text-muted focus:ring-2 focus:ring-cream"
        autoFocus
      />
      <FormError message={error} />
      <Button type="submit" disabled={busy || !code.trim()} className="mt-auto">
        {busy ? "Sprawdzam…" : "Odzyskaj ligę"}
      </Button>
    </form>
  );
}
