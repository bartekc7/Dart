"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { ButtonLink } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { Loading } from "@/components/league/StatusScreens";
import { api, ApiError } from "@/lib/api";
import { playerColor } from "@/lib/colors";
import { DUEL_TARGETS } from "@/lib/duel";
import { useDuelEvenRounds } from "@/lib/game/storage";
import type { Opponent } from "@/lib/server/duels";
import { useDuels } from "./DuelProvider";
import { DuelIcon } from "@/components/ui/DuelIcon";

type Starter = "me" | "rival" | "random";
const STARTERS: { value: Starter; label: string }[] = [
  { value: "me", label: "Ja" },
  { value: "rival", label: "Rywal" },
  { value: "random", label: "🎲 Losuj" },
];

/** Nowy pojedynek: do ilu, kto zaczyna i kogo zaprosić (zaproszenie wyskakuje w jego aplikacji). */
export function NewDuel({ focusId }: { focusId?: string }) {
  const duels = useDuels();
  const router = useRouter();
  const [target, setTarget] = useState<number>(101);
  const [starter, setStarter] = useState<Starter>("me");
  // Wyrównana runda: domyślnie wyłączona, telefon pamięta ostatni wybór.
  const [evenStored, setEvenRounds] = useDuelEvenRounds();
  const evenRounds = evenStored === true;
  const [list, setList] = useState<Opponent[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasProfile = !!duels?.profile;

  useEffect(() => {
    if (!hasProfile) return;
    let alive = true;
    api<{ opponents: Opponent[] }>("/api/duels/opponents")
      // Wejście z ekranu „Ty vs rywal”: ten rywal na górze listy.
      .then((d) => alive && setList([...d.opponents].sort((a, b) => Number(b.id === focusId) - Number(a.id === focusId))))
      .catch((e: ApiError) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [hasProfile, focusId]);

  if (!duels) return <Loading />;
  if (!duels.profile) {
    return (
      <>
        <AppHeader title={<><DuelIcon /> 1 na 1</>} backHref="/" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-5xl"><DuelIcon /></p>
          <p className="max-w-xs text-muted">
            Grę 1 na 1 zaczniesz, gdy dołączysz do ligi albo przyjmiesz zaproszenie od znajomego.
          </p>
          <ButtonLink href="/" className="max-w-xs">
            Wróć na start
          </ButtonLink>
        </div>
      </>
    );
  }
  if (duels.active) {
    return (
      <>
        <AppHeader title={<><DuelIcon /> 1 na 1</>} backHref="/" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-5xl"><DuelIcon /></p>
          <p className="max-w-xs text-muted">Masz trwający pojedynek. Dokończ go albo anuluj, zanim zaczniesz nowy.</p>
          <ButtonLink href={`/1na1/${duels.active.id}`} className="max-w-xs">
            Wróć do pojedynku
          </ButtonLink>
        </div>
      </>
    );
  }

  async function invite(rivalId: string | null) {
    setBusy(rivalId ?? "link");
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/duels", { body: { target, starter, rivalId, evenRounds } });
      router.push(`/1na1/${id}`);
    } catch (e) {
      setError((e as ApiError).message);
      setBusy(null);
    }
  }

  return (
    <>
      <AppHeader title="Nowy pojedynek" backHref="/1na1" />
      <div className="flex flex-col gap-5">
        <p className="-mt-3 text-sm text-muted">Gra towarzyska 1 na 1. Nie wpływa na ranking ligi.</p>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Gramy do</h2>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Gramy do">
            {DUEL_TARGETS.map((t) => (
              <Chip key={t} on={t === target} onClick={() => setTarget(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Kto zaczyna</h2>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Kto zaczyna">
            {STARTERS.map((s) => (
              <Chip key={s.value} on={s.value === starter} onClick={() => setStarter(s.value)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </section>
        <button
          type="button"
          role="switch"
          aria-checked={evenRounds}
          onClick={() => setEvenRounds(!evenRounds)}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition active:scale-[0.99] ${
            evenRounds ? "bg-surface-2 ring-2 ring-cream" : "bg-surface-2/60 ring-1 ring-line"
          }`}
        >
          <span className="min-w-0 flex-1 leading-snug">
            <span className="block font-bold">Wyrównana runda</span>
            <span className="block text-sm text-muted">
              Gdy zaczynający zejdzie do 0, rywal rzuca jeszcze swoją serię. Też zejdzie do 0 – remis.
            </span>
          </span>
          <span
            aria-hidden
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${evenRounds ? "bg-green" : "bg-line"}`}
          >
            <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${evenRounds ? "left-[1.375rem]" : "left-0.5"}`} />
          </span>
        </button>
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Z kim grasz?</h2>
          <FormError message={error} />
          {list === null && !error ? (
            <Loading />
          ) : list?.length === 0 ? (
            <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
              Nie masz jeszcze rywali. Zaproś kogoś niżej.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {list?.map((o) => (
                <li key={o.id} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-line">
                  <PlayerDot color={playerColor(o.color)} icon={o.icon} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{o.name}</span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">
                    {o.won + o.lost + o.drawn > 0 ? `${o.won} : ${o.lost}${o.drawn ? ` · ${o.drawn} r.` : ""}` : o.inLeague ? "z ligi" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => invite(o.id)}
                    disabled={busy !== null}
                    className="min-h-10 shrink-0 rounded-xl bg-green px-4 font-semibold text-white transition active:scale-95 disabled:opacity-40"
                  >
                    {busy === o.id ? "…" : "Zaproś"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => invite(null)}
            disabled={busy !== null}
            className="mt-1 py-2 text-center text-sm text-muted disabled:opacity-40"
          >
            Ktoś nowy, spoza ligi? <strong className="text-cream">Zaproś pierwszy raz ›</strong>
          </button>
        </section>
      </div>
    </>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-12 rounded-2xl text-lg font-bold transition active:scale-95 ${
        on ? "bg-surface-2 ring-2 ring-cream" : "bg-surface-2/60 ring-1 ring-line"
      }`}
    >
      {children}
    </button>
  );
}
