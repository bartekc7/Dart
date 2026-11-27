"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { ButtonLink } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { FormCard } from "@/components/league/FormCard";
import { Loading } from "@/components/league/StatusScreens";
import { fmt } from "@/components/game/FinalStandings";
import { RECORD_COLOR } from "@/components/achievements/AchievementToasts";
import { api, ApiError } from "@/lib/api";
import { playerColor } from "@/lib/colors";
import { formatRecord, recordLabel, recordOrder } from "@/lib/game/records";
import type { DuelSummary, Opponent } from "@/lib/server/duels";
import { DuelBanner } from "./DuelHome";
import { useDuels } from "./DuelProvider";
import { DuelIcon } from "@/components/ui/DuelIcon";

const day = (ms: number) => new Date(ms).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });

/** Ekran 1 na 1: nowy pojedynek, mój bilans, rywale z bilansem i moje rekordy 1 na 1. */
export function DuelHub() {
  const duels = useDuels();
  const hasProfile = !!duels?.profile;
  const [summary, setSummary] = useState<DuelSummary | null>(null);
  const [rivals, setRivals] = useState<Opponent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasProfile) return;
    let alive = true;
    Promise.all([api<DuelSummary>("/api/duels/stats"), api<{ opponents: Opponent[] }>("/api/duels/opponents")])
      .then(([s, o]) => {
        if (!alive) return;
        setSummary(s);
        setRivals(o.opponents.filter((x) => x.lastPlayed));
      })
      .catch((e: ApiError) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [hasProfile]);

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

  const t = summary?.totals;
  const mine = summary ? (summary.records.personal[summary.profile.id] ?? {}) : {};
  const keys = Object.keys(mine).sort((a, b) => recordOrder(a) - recordOrder(b));

  return (
    <>
      <AppHeader title={<><DuelIcon /> 1 na 1</>} backHref="/" />
      <div className="flex flex-col gap-4">
        <p className="-mt-4 text-sm text-muted">Gry towarzyskie poza ligą. Nie wpływają na ranking ligi.</p>
        <DuelBanner />
        {!duels.active && <ButtonLink href="/1na1/nowy">Nowy pojedynek</ButtonLink>}
        <FormError message={error} />
        {!summary && !error ? (
          <Loading />
        ) : (
          summary &&
          t && (
            <>
              <section className="rounded-2xl bg-surface px-4 py-3 ring-1 ring-line" aria-label="Twój bilans">
                <div className="flex items-center gap-3">
                  <PlayerDot color={playerColor(summary.profile.color)} icon={summary.profile.icon} />
                  <span className="flex-1 font-semibold">Twój bilans</span>
                  <span className="font-mono text-2xl font-bold tabular-nums">
                    {t.won} : {t.lost}
                  </span>
                </div>
                {t.drawn > 0 && <p className="text-right text-sm text-muted">remisy: {t.drawn}</p>}
                <div className="mt-1 flex justify-between text-sm text-muted">
                  <span>{t.games === 1 ? "1 gra" : `${t.games} ${t.games % 10 >= 2 && t.games % 10 <= 4 && (t.games % 100 < 12 || t.games % 100 > 14) ? "gry" : "gier"}`}</span>
                  <span>{t.games ? `${Math.round((t.won / t.games) * 100)}% wygranych` : "–"}</span>
                  <span>śr. {fmt(t.average)} / 3 rz.</span>
                </div>
              </section>

              {summary.form && (
                <FormCard form={summary.form} title="Twoja forma" source="z 10 ostatnich pojedynków" legend={false} />
              )}

              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Twoi rywale</h2>
                {rivals?.length ? (
                  <ul className="flex flex-col gap-2">
                    {rivals.map((o) => (
                      <li key={o.id}>
                        <Link href={`/1na1/rywal/${o.id}`} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-line active:bg-surface-2">
                          <PlayerDot color={playerColor(o.color)} icon={o.icon} />
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate font-semibold">
                              {o.name}
                              {!o.inLeague && <span className="ml-1.5 text-xs font-normal text-muted">spoza ligi</span>}
                            </span>
                            <span className="block text-sm text-muted">
                              {day(new Date(o.lastPlayed!).getTime())} · {o.lastWon === null ? "remis" : o.lastWon ? "wygrana" : "przegrana"}
                            </span>
                          </span>
                          <span className="font-mono text-xl font-bold tabular-nums">
                            <span className={o.won > o.lost ? "text-green" : ""}>{o.won}</span> : <span className={o.lost > o.won ? "text-red" : ""}>{o.lost}</span>
                            {o.drawn > 0 && <span className="ml-1 text-sm font-normal text-muted">({o.drawn} r.)</span>}
                          </span>
                          <span className="text-muted" aria-hidden>
                            ›
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-line">
                    Tu pojawią się rywale z bilansem, gdy rozegrasz pierwszą grę 1 na 1.
                  </p>
                )}
              </section>

              {keys.length > 0 && (
                <section aria-labelledby="duel-records">
                  <h2 id="duel-records" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
                    📈 Twoje rekordy 1 na 1
                  </h2>
                  <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
                    {keys.map((k) => (
                      <li key={k} className="flex items-center gap-3 px-4 py-3">
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block font-semibold">{recordLabel(k)}</span>
                          <span className="block text-sm text-muted">{day(mine[k].at)}</span>
                        </span>
                        <span className="font-mono text-2xl font-bold tabular-nums" style={{ color: RECORD_COLOR }}>
                          {formatRecord(k, mine[k].value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )
        )}
      </div>
    </>
  );
}
