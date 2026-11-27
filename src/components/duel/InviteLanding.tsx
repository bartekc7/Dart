"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { LookPicker } from "@/components/ui/LookPicker";
import { Loading } from "@/components/league/StatusScreens";
import { api, ApiError } from "@/lib/api";
import type { DuelProfile } from "@/lib/duel";
import type { LookKey } from "@/lib/looks";
import { DuelIcon } from "@/components/ui/DuelIcon";

type Preview =
  | { valid: false; profile: DuelProfile | null }
  | { valid: true; profile: DuelProfile | null; own: boolean; inviter: { name: string }; target: number; inviterStarts: boolean };

/**
 * Link z zaproszeniem dla nowej osoby (pierwszy raz). Kto nie ma jeszcze
 * profilu, podaje nazwę i znak – raz na zawsze – i od razu gra.
 */
export function InviteLanding({ code }: { code: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [look, setLook] = useState<LookKey>("color:1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Preview>(`/api/duels/code/${encodeURIComponent(code)}`)
      .then(setPreview)
      .catch((e: ApiError) => setLoadError(e.message));
  }, [code]);

  if (loadError) return <Gone text={loadError} />;
  if (!preview) return <Loading />;
  if (!preview.valid) return <Gone text="To zaproszenie zostało już użyte albo wygasło. Poproś o nowe." />;
  if (preview.own) return <Gone text="To Twoje zaproszenie – pokaż kod QR albo wyślij link rywalowi." />;

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>(`/api/duels/code/${encodeURIComponent(code)}`, {
        body: preview?.profile ? {} : { name, look },
      });
      router.push(`/1na1/${id}`);
    } catch (err) {
      setError((err as ApiError).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={accept} className="flex flex-1 flex-col gap-5">
      <section className="mt-6 rounded-3xl bg-gradient-to-br from-[#1e3a8a] to-[#1d4ed8] px-4 py-6 text-center text-white">
        <p className="text-5xl" aria-hidden>
          <DuelIcon />
        </p>
        <p className="mt-2 text-2xl">
          <strong>{preview.inviter.name}</strong> zaprasza Cię
        </p>
        <p className="mt-1 opacity-90">
          do gry 1 na 1 · do {preview.target} · zaczyna {preview.inviterStarts ? preview.inviter.name : "Ty"}
        </p>
      </section>
      {preview.profile ? (
        <p className="text-center text-muted">Grasz jako {preview.profile.name}.</p>
      ) : (
        <>
          <Field label="Jak się nazywasz?" placeholder="np. Marek" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-muted">Twój znak</span>
            <LookPicker value={look} onChange={setLook} taken={[]} />
          </div>
        </>
      )}
      <FormError message={error} />
      <div className="mt-auto grid grid-cols-[1fr_1.6fr] gap-2">
        <ButtonLink href="/" variant="secondary">
          Nie teraz
        </ButtonLink>
        <Button type="submit" disabled={busy || (!preview.profile && !name.trim())} className="bg-green! shadow-green/20">
          ✓ Gramy!
        </Button>
      </div>
    </form>
  );
}

function Gone({ text }: { text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl">🔗</p>
      <p className="text-lg font-semibold">Zaproszenie nieaktualne</p>
      <p className="max-w-xs text-muted">{text}</p>
      <ButtonLink href="/" variant="secondary" className="max-w-xs">
        Na start
      </ButtonLink>
    </div>
  );
}
