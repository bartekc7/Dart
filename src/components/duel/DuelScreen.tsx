"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { Loading } from "@/components/league/StatusScreens";
import { ShareLink } from "@/components/league/ShareLink";
import { api, ApiError } from "@/lib/api";
import type { Duel, DuelProfile } from "@/lib/duel";
import { usePoll } from "@/lib/live/usePoll";
import { DuelPlay } from "./DuelPlay";
import { DuelResults } from "./DuelResults";
import { InviteCard } from "./InviteCard";

type Data = { duel: Duel; me: string };

/** Gdy coś się dzieje (zaproszenie, gra) – szybko; po grze rzadziej. */
const LIVE_MS = 1500;
const QUIET_MS = 5000;

/** Jedna gra 1 na 1 od zaproszenia do wyników. Oba telefony pytają serwer o stan co 1,5 s. */
export function DuelScreen({ id }: { id: string }) {
  const poll = usePoll<Data>(`/api/duels/${id}`, (d) =>
    d && (d.duel.status === "pending" || d.duel.status === "active") ? LIVE_MS : QUIET_MS,
  );
  // Odpowiedź po mojej akcji (seria, cofnięcie) jest świeższa niż ostatnie odpytanie.
  const [mine, setMine] = useState<Duel | null>(null);

  if (poll.status === "loading") return <Loading />;
  if (poll.status === "error") {
    return (
      <main className="flex flex-1 flex-col">
        <AppHeader title="1 na 1" backHref="/" />
        <Message icon="🤷" title={poll.error.status === 404 ? "Nie ma takiej gry" : "Nie udało się wczytać gry"} text={poll.error.message} />
      </main>
    );
  }
  const polled = poll.data.duel;
  const duel = mine && mine.id === polled.id && mine.rev > polled.rev ? mine : polled;
  const meId = poll.data.me;
  const rival = duel.inviter.id === meId ? duel.rival : duel.inviter;

  switch (duel.status) {
    case "active":
      return <DuelPlay duel={duel} meId={meId} onDuel={setMine} />;
    case "finished":
      return <DuelResults duel={duel} meId={meId} onDuel={setMine} />;
    case "pending":
      return duel.inviter.id === meId ? <Waiting duel={duel} /> : <Invited duel={duel} />;
    default:
      return <Closed duel={duel} meId={meId} rival={rival} />;
  }
}

/** Zapraszający czeka na „Gramy!”. Nowa osoba dostaje link albo QR. */
function Waiting({ duel }: { duel: Duel }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const starts = duel.starterId === duel.inviter.id ? "zaczynasz Ty" : duel.rival ? `zaczyna ${duel.rival.name}` : "zaczyna rywal";
  const url = duel.inviteCode && typeof window !== "undefined" ? `${window.location.origin}/1na1/zaproszenie/${duel.inviteCode}` : null;

  async function cancel() {
    try {
      await api(`/api/duels/${duel.id}/cancel`, { method: "POST" });
      router.push("/1na1");
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4">
      <AppHeader title="Zaproszenie" backHref="/" />
      {url ? (
        <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4 ring-1 ring-line">
          <p className="text-center">Niech rywal zeskanuje kod aparatem albo wyślij mu link.</p>
          <ShareLink url={url} title="Zagrajmy 1 na 1 w darta" text={`Zaproszenie do gry 1 na 1 (do ${duel.target})`} />
        </div>
      ) : null}
      <div className={`flex flex-col items-center gap-2 rounded-3xl bg-surface px-4 text-center ring-1 ring-line ${url ? "py-4" : "mt-8 py-8"}`}>
        <p className="text-4xl" aria-hidden>
          ⏳
        </p>
        <p className="text-xl">
          Czekamy na <strong>{duel.rival?.name ?? "rywala"}</strong>…
        </p>
        <p className="text-sm text-muted">
          {duel.rival ? "Zaproszenie wyskoczyło w aplikacji rywala." : "Link działa raz."}
          <br />
          do {duel.target} · {starts} · ważne 10 min
        </p>
      </div>
      <FormError message={error} />
      <Button variant="secondary" onClick={cancel}>
        Anuluj zaproszenie
      </Button>
    </main>
  );
}

/** Rywal otworzył grę z zaproszeniem (np. z paska na ekranie głównym). */
function Invited({ duel }: { duel: Duel }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "accept" | "decline") {
    setBusy(true);
    try {
      await api(`/api/duels/${duel.id}/${action}`, { method: "POST" });
      if (action === "decline") router.push("/");
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col justify-center">
      <InviteCard duel={duel} busy={busy} error={error} onAccept={() => act("accept")} onDecline={() => act("decline")} />
    </main>
  );
}

/** Zaproszenie odrzucone, wygasłe albo gra anulowana. */
function Closed({ duel, meId, rival }: { duel: Duel; meId: string; rival: DuelProfile | null }) {
  const name = rival?.name ?? "Rywal";
  const iInvited = duel.inviter.id === meId;
  const { icon, title, text } =
    duel.status === "declined"
      ? iInvited
        ? { icon: "🙅", title: `${name} nie gra teraz`, text: "Zaproszenie zostało odrzucone." }
        : { icon: "👋", title: "Odrzucono zaproszenie", text: "Może następnym razem." }
      : duel.status === "expired"
        ? { icon: "⌛", title: iInvited ? `Brak odpowiedzi: ${name}` : "Zaproszenie wygasło", text: "Zaproszenie jest ważne 10 minut." }
        : duel.state
          ? { icon: "✕", title: "Gra anulowana", text: "Nie liczy się do bilansu." }
          : { icon: "✕", title: "Zaproszenie anulowane", text: "" };
  return (
    <main className="flex flex-1 flex-col gap-4">
      <AppHeader title="1 na 1" backHref="/" />
      <Message icon={icon} title={title} text={text} />
      <ButtonLink href="/1na1">{iInvited ? "Zaproś kogoś innego" : "Nowy pojedynek"}</ButtonLink>
      <ButtonLink href="/" variant="secondary">
        Wróć na start
      </ButtonLink>
    </main>
  );
}

function Message({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <div className="mt-8 flex flex-col items-center gap-2 rounded-3xl bg-surface px-4 py-8 text-center ring-1 ring-line">
      <p className="text-5xl" aria-hidden>
        {icon}
      </p>
      <p className="text-xl font-semibold">{title}</p>
      {text && <p className="text-sm text-muted">{text}</p>}
    </div>
  );
}
