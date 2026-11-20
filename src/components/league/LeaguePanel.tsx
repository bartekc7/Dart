"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { api } from "@/lib/api";
import type { Member } from "@/lib/server/league";
import { AddMemberForm } from "./AddMemberForm";
import { useLeague } from "./LeagueProvider";
import { ClearLeague } from "./ClearLeague";
import { RecoveryCode } from "./RecoveryCode";
import { ShareLink } from "./ShareLink";
import { LoadError, Loading } from "./StatusScreens";

/** Panel ligi: zaproszenie (link + QR), lista graczy i akcje organizatora. */
export function LeaguePanel() {
  const { state } = useLeague();
  const [open, setOpen] = useState<string | null>(null);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <LoadError {...state} />;
  const { me, members } = state.data;
  if (!me) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted">
          Ten telefon nie należy jeszcze do żadnej ligi.
        </p>
        <ButtonLink href="/" className="max-w-xs">
          Wróć na start
        </ButtonLink>
      </div>
    );
  }

  const organizer = me.member.isOrganizer;
  const joinUrl = `${window.location.origin}/dolacz/${me.league.joinCode}`;

  return (
    <div className="flex flex-col gap-8 pb-6">
      <section>
        <h2 className="text-xl font-bold">{me.league.name}</h2>
        <p className="mt-1 mb-4 text-muted">
          Wyślij link lub pokaż kod QR. Kto go otworzy, poda swoją nazwę i od
          razu jest w lidze.
        </p>
        <ShareLink
          url={joinUrl}
          title={`Liga ${me.league.name}`}
          text={`Dołącz do ligi „${me.league.name}” w Dart:`}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
          Gracze ({members.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isMe={m.id === me.member.id}
              canManage={organizer || m.id === me.member.id}
              open={open === m.id}
              onToggle={() => setOpen(open === m.id ? null : m.id)}
            />
          ))}
        </ul>
        {organizer && (
          <p className="mt-2 text-sm text-muted">
            Ktoś zmienił telefon? Dotknij jego nazwy i wyślij mu link „Nowy
            telefon”.
          </p>
        )}
      </section>

      {organizer && <RecoveryCode hasCode={me.league.hasRecoveryCode} />}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
          Dodaj gracza bez telefonu
        </h2>
        <AddMemberForm />
      </section>

      {organizer && <ClearLeague leagueName={me.league.name} />}
    </div>
  );
}

function MemberRow({
  member,
  isMe,
  canManage,
  open,
  onToggle,
}: {
  member: Member;
  isMe: boolean;
  canManage: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const label = (
    <>
      <span className="min-w-0 flex-1 truncate text-lg font-medium">
        {member.name}
        {isMe && <span className="text-muted"> (Ty)</span>}
      </span>
      {member.isOrganizer && (
        <span className="rounded-full bg-cream/15 px-2 py-0.5 text-xs font-semibold text-cream">
          organizator
        </span>
      )}
      {!member.hasDevice && (
        <span className="text-xs text-muted">bez telefonu</span>
      )}
    </>
  );

  if (!canManage) {
    return (
      <li className="flex min-h-14 items-center gap-2 rounded-2xl bg-surface px-4 ring-1 ring-line">
        {label}
      </li>
    );
  }

  return (
    <li
      className={`rounded-2xl bg-surface ring-1 ${open ? "ring-cream" : "ring-line"}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-2 px-4 text-left"
      >
        {label}
        <span
          className={`text-muted transition-transform ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </button>
      {open && <MemberActions member={member} self={isMe} />}
    </li>
  );
}

function MemberActions({ member, self }: { member: Member; self: boolean }) {
  const { refresh } = useLeague();
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  const newDevice = () =>
    run(async () => {
      const { token } = await api<{ token: string }>(
        `/api/members/${member.id}/claim`,
        {
          method: "POST",
        },
      );
      setClaimUrl(`${window.location.origin}/przypisz/${token}`);
    });

  const [confirmRemove, setConfirmRemove] = useState(false);
  const removeMember = () =>
    run(async () => {
      await api(`/api/members/${member.id}`, { method: "DELETE" });
      await refresh();
    });

  const makeOrganizer = () =>
    run(async () => {
      await api(`/api/members/${member.id}/organizer`, { method: "POST" });
      await refresh();
    });

  return (
    <div className="flex flex-col gap-3 border-t border-line p-4">
      {claimUrl ? (
        <>
          <p className="text-sm">
            {self ? (
              <>
                Otwórz ten link na drugim urządzeniu albo zeskanuj nim kod.
                Będziesz tam jako <strong>{member.name}</strong>, a ten telefon
                zostaje podłączony. Link działa raz, przez 48 godzin.
              </>
            ) : (
              <>
                Wyślij ten link do: <strong>{member.name}</strong> albo daj
                zeskanować kod. Otwarcie linku na nowym telefonie przypisze go
                do tego gracza. Link działa raz, przez 48 godzin.
              </>
            )}
          </p>
          <ShareLink
            url={claimUrl}
            title={`Dart – ${member.name}`}
            text={
              self
                ? "Mój link do Dart na drugie urządzenie:"
                : `${member.name}, otwórz ten link na swoim telefonie:`
            }
          />
        </>
      ) : (
        <Button variant="secondary" onClick={newDevice} disabled={busy}>
          📱{" "}
          {self
            ? "Dodaj drugie urządzenie"
            : member.hasDevice
              ? "Nowy telefon"
              : "Połącz z telefonem"}
        </Button>
      )}

      {!self && (
        <>
          {confirm ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-3">
              <p className="text-sm">
                <strong>{member.name}</strong> zostanie organizatorem, a Ty
                zwykłym graczem. Na pewno?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setConfirm(false)}
                  disabled={busy}
                >
                  Anuluj
                </Button>
                <Button onClick={makeOrganizer} disabled={busy}>
                  Tak, przekaż
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setConfirm(true)}
              className="min-h-11 text-base"
            >
              👑 Zrób organizatorem
            </Button>
          )}
          {confirmRemove ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-3">
              <p className="text-sm">
                Usunąć <strong>{member.name}</strong> z ligi? Zniknie z listy
                graczy, a telefon zostanie odłączony. Rozegrane gry zostają w
                rankingu i historii.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmRemove(false)}
                  disabled={busy}
                >
                  Anuluj
                </Button>
                <Button onClick={removeMember} disabled={busy}>
                  Usuń
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setConfirmRemove(true)}
              className="min-h-11 text-base text-red"
            >
              🗑 Usuń gracza
            </Button>
          )}
        </>
      )}
      <FormError message={error} />
    </div>
  );
}
