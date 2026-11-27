"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { usePoll } from "@/lib/live/usePoll";
import type { DuelsMe } from "@/lib/server/duels";
import { InviteCard } from "./InviteCard";

/** Gdy czekam na odpowiedź rywala – szybciej, żeby gra ruszyła od razu po „Gramy!”. */
const WAITING_POLL_MS = 1500;
/** Zwykle: zaproszenie od rywala pojawia się po kilku sekundach. */
const IDLE_POLL_MS = 5000;

const DuelContext = createContext<DuelsMe | null>(null);

/**
 * Gry 1 na 1 w tle całej aplikacji: telefon co kilka sekund sprawdza, czy ktoś
 * go zaprasza. Zaproszenie wyskakuje jako okno nad każdym ekranem.
 */
export function DuelProvider({ children }: { children: ReactNode }) {
  const poll = usePoll<DuelsMe>("/api/duels/me", (d) => (d?.outgoing ? WAITING_POLL_MS : IDLE_POLL_MS));
  const data = poll.status === "ready" ? poll.data : null;
  return (
    <DuelContext.Provider value={data}>
      {children}
      {data?.incoming && <IncomingInvite key={data.incoming.id} duel={data.incoming} />}
    </DuelContext.Provider>
  );
}

/** Stan 1 na 1 tego telefonu (null = jeszcze nie wczytano albo brak bazy). */
export function useDuels(): DuelsMe | null {
  return useContext(DuelContext);
}

function IncomingInvite({ duel }: { duel: NonNullable<DuelsMe["incoming"]> }) {
  const router = useRouter();
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Krótka wibracja, żeby zaproszenie nie umknęło (Android).
  useEffect(() => {
    try {
      navigator.vibrate?.([60, 60, 60]);
    } catch {}
  }, []);
  // Na ekranie tej gry zaproszenie jest już pokazane w treści.
  if (hidden || path === `/1na1/${duel.id}`) return null;

  async function act(action: "accept" | "decline") {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/duels/${duel.id}/${action}`, { method: "POST" });
      setHidden(true);
      if (action === "accept") router.push(`/1na1/${duel.id}`);
    } catch (e) {
      setError((e as ApiError).message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal aria-label="Zaproszenie do gry 1 na 1">
      <div className="w-full max-w-sm">
        <InviteCard duel={duel} busy={busy} error={error} onAccept={() => act("accept")} onDecline={() => act("decline")} />
      </div>
    </div>
  );
}
