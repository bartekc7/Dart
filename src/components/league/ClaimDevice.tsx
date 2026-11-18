"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { Message } from "./JoinLeague";
import { useLeague } from "./LeagueProvider";
import { Loading } from "./StatusScreens";

/** Link od organizatora: przypisuje gracza do tego (nowego) telefonu. */
export function ClaimDevice({ token }: { token: string }) {
  const router = useRouter();
  const { refresh } = useLeague();
  const [preview, setPreview] = useState<{ playerName: string; leagueName: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ playerName: string; leagueName: string }>(`/api/claim/${encodeURIComponent(token)}`)
      .then(setPreview)
      .catch((e: Error) => setLoadError(e.message));
  }, [token]);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/claim/${encodeURIComponent(token)}`, { method: "POST" });
      await refresh();
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (loadError)
    return (
      <Message emoji="⏳" title="Link nieaktualny" text={loadError}>
        <ButtonLink href="/" variant="secondary">
          Na start
        </ButtonLink>
      </Message>
    );
  if (!preview) return <Loading />;

  return (
    <Message
      emoji="📱"
      title={`Grasz jako ${preview.playerName}?`}
      text={`Ten telefon zostanie przypisany do gracza ${preview.playerName} w lidze „${preview.leagueName}”.`}
    >
      <FormError message={error} />
      <Button onClick={confirm} disabled={busy}>
        {busy ? "Przypisuję…" : `Tak, to ja`}
      </Button>
      <ButtonLink href="/" variant="ghost">
        To nie ja
      </ButtonLink>
    </Message>
  );
}
