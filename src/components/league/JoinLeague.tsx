"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { LookPicker } from "@/components/ui/LookPicker";
import { api } from "@/lib/api";
import { suggestedLook, type LookKey } from "@/lib/looks";
import { useLeague } from "./LeagueProvider";
import { Loading } from "./StatusScreens";

type Invite = { leagueName: string; memberName: string | null; otherLeague: string | null; taken?: LookKey[] };

export function JoinLeague({ code }: { code: string }) {
  const router = useRouter();
  const { refresh } = useLeague();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  /** Wybrany znak; null = bez zmian, czyli domyślny (pierwszy wolny kolor). */
  const [look, setLook] = useState<LookKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Invite>(`/api/join/${encodeURIComponent(code)}`)
      .then(setInvite)
      .catch((e: Error) => setLoadError(e.message));
  }, [code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/join/${encodeURIComponent(code)}`, { body: look ? { name, look } : { name } });
      await refresh();
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (loadError)
    return (
      <Message emoji="🔗" title="Ten link nie działa" text={loadError}>
        <ButtonLink href="/" variant="secondary">
          Na start
        </ButtonLink>
      </Message>
    );
  if (!invite) return <Loading />;
  if (invite.memberName)
    return (
      <Message
        emoji="👋"
        title={`Jesteś już w lidze „${invite.leagueName}”`}
        text={`Ten telefon gra jako ${invite.memberName}.`}
      >
        <ButtonLink href="/">Przejdź do ligi</ButtonLink>
      </Message>
    );

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
      <section className="pt-6 text-center">
        <p className="text-5xl">🎯</p>
        <p className="mt-3 text-muted">Zaproszenie do ligi</p>
        <h1 className="text-3xl font-bold">{invite.leagueName}</h1>
      </section>
      <Field
        label="Twoja nazwa"
        placeholder="np. Ania"
        value={name}
        maxLength={20}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <p className="text-sm text-muted">
        Tak zobaczą Cię inni w rankingu. Ten telefon zapamięta ligę, więc następnym razem otworzy
        się sama.
      </p>
      <LookSection
        value={look ?? suggestedLook(invite.taken ?? [])}
        taken={invite.taken ?? []}
        onChange={(k) => {
          setLook(k);
          setError(null);
        }}
      />
      {invite.otherLeague && (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
          Ten telefon jest teraz w lidze „{invite.otherLeague}”. Dołączenie przeniesie go do nowej
          ligi.
        </p>
      )}
      <FormError message={error} />
      <Button type="submit" disabled={busy || !name.trim()} className="mt-auto">
        {busy ? "Dołączam…" : "Dołącz do ligi"}
      </Button>
    </form>
  );
}

export function Message({
  emoji,
  title,
  text,
  children,
}: {
  emoji: string;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-5xl">{emoji}</p>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="max-w-xs text-muted">{text}</p>
      </section>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

/** „Twój kolor albo ikonka” przy zakładaniu gracza (zajęte są wyszarzone). */
export function LookSection({
  value,
  taken,
  onChange,
}: {
  value: LookKey;
  taken: LookKey[];
  onChange: (k: LookKey) => void;
}) {
  return (
    <section aria-labelledby="look-title" className="flex flex-col gap-2">
      <h2 id="look-title" className="text-sm font-semibold uppercase tracking-wider text-muted">
        Twój kolor albo ikonka
      </h2>
      <LookPicker value={value} taken={taken} onChange={onChange} />
      <p className="text-xs text-muted">Zmienisz później w Opcjach (⚙️).</p>
    </section>
  );
}
