"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { ButtonLink } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { Loading } from "@/components/league/StatusScreens";
import { fmt, seriesWord } from "@/components/game/FinalStandings";
import { api, ApiError } from "@/lib/api";
import { playerColor } from "@/lib/colors";
import type { DuelProfile } from "@/lib/duel";
import type { HeadToHead } from "@/lib/duelStats";
import { formatDuration } from "@/lib/game/engine";
import { useDuels } from "./DuelProvider";
import { DuelIcon } from "@/components/ui/DuelIcon";

const when = (ms: number) => {
  const d = new Date(ms);
  const today = new Date();
  const time = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `dziś ${time}`;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
};

/** Ty vs rywal: bilans, seria wygranych, porównanie i ostatnie wspólne gry. */
export function RivalView({ id }: { id: string }) {
  const duels = useDuels();
  const [data, setData] = useState<{ rival: DuelProfile; h2h: HeadToHead } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ rival: DuelProfile; h2h: HeadToHead }>(`/api/duels/rival/${encodeURIComponent(id)}`)
      .then((d) => alive && setData(d))
      .catch((e: ApiError) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error)
    return (
      <>
        <AppHeader title="1 na 1" backHref="/1na1" />
        <FormError message={error} />
      </>
    );
  if (!data || !duels?.profile) return <Loading />;
  const { rival, h2h } = data;
  const me = duels.profile;
  const games = h2h.won + h2h.lost + h2h.drawn;
  const streak = h2h.streak && h2h.streak.n > 1 ? h2h.streak : null;

  return (
    <>
      <AppHeader title={`Ty vs ${rival.name}`} backHref="/1na1" />
      <div className="flex flex-col gap-4">
        <section className="rounded-3xl bg-surface p-4 ring-1 ring-line" aria-label="Bilans">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center text-center font-mono text-5xl font-bold tabular-nums">
            <span className={h2h.won > h2h.lost ? "text-green" : ""}>{h2h.won}</span>
            <span className="text-4xl text-muted">:</span>
            <span className={h2h.lost > h2h.won ? "text-green" : ""}>{h2h.lost}</span>
          </div>
          {games > 0 && (
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full" aria-hidden>
              <span style={{ flex: h2h.won, backgroundColor: playerColor(me.color) }} />
              <span style={{ flex: h2h.drawn, backgroundColor: "var(--color-line)" }} />
              <span style={{ flex: h2h.lost, backgroundColor: playerColor(rival.color) }} />
            </div>
          )}
          <p className="mt-2 flex justify-between gap-2 text-sm text-muted">
            <span>
              {games} {games === 1 ? "gra" : games % 10 >= 2 && games % 10 <= 4 && (games % 100 < 12 || games % 100 > 14) ? "gry" : "gier"}
              {h2h.drawn > 0 && ` · remisy ${h2h.drawn}`}
              {h2h.since && ` · od ${new Date(h2h.since).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}`}
            </span>
            {streak && (
              <span>
                {streak.winnerId === me.id ? "Ty" : rival.name}: {streak.n} {streak.n < 5 ? "wygrane" : "wygranych"} z rzędu
              </span>
            )}
          </p>
        </section>

        {games > 0 && (
          <section className="rounded-3xl bg-surface px-4 py-1 ring-1 ring-line" aria-label="Porównanie">
            <Row a="Ty" label="" b={rival.name} head />
            <Row a={fmt(h2h.me.average)} label="średnia / 3 rz." b={fmt(h2h.rival.average)} />
            <Row a={String(h2h.me.best)} label="najlepsza seria" b={String(h2h.rival.best)} />
            <Row
              a={h2h.me.fastest ? `${h2h.me.fastest} ${seriesWord(h2h.me.fastest)}` : "–"}
              label="najszybsza wygrana"
              b={h2h.rival.fastest ? `${h2h.rival.fastest} ${seriesWord(h2h.rival.fastest)}` : "–"}
              last={h2h.avgDurationMs === null}
            />
            {h2h.avgDurationMs !== null && (
              <p className="py-2 text-center text-sm text-muted">
                średni czas gry: <strong className="text-ink">{formatDuration(h2h.avgDurationMs)}</strong>
              </p>
            )}
          </section>
        )}

        {h2h.recent.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Ostatnie gry</h2>
            <ul className="flex flex-col gap-2">
              {h2h.recent.map((g) => (
                <li key={g.id}>
                  <Link href={`/1na1/${g.id}`} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-line active:bg-surface-2">
                    <span className="w-6 text-center" aria-hidden>
                      {g.draw ? "🤝" : g.won ? "🏆" : "✗"}
                    </span>
                    <span className="flex-1">
                      {g.draw ? "Remis" : g.won ? "Wygrana" : "Przegrana"} · do {g.target}
                      {g.durationMs !== null && <span className="text-muted"> · {formatDuration(g.durationMs)}</span>}
                    </span>
                    <span className="text-sm text-muted">{when(g.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!duels.active && <ButtonLink href={`/1na1/nowy?r=${encodeURIComponent(rival.id)}`}><DuelIcon /> Zaproś do gry</ButtonLink>}
      </div>
    </>
  );
}

function Row({ a, label, b, head, last }: { a: string; label: string; b: string; head?: boolean; last?: boolean }) {
  return (
    <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 ${last ? "" : "border-b border-line"} ${head ? "text-sm text-muted" : ""}`}>
      <span className={head ? "" : "font-bold"}>{a}</span>
      <span className="text-center text-sm text-muted">{label}</span>
      <span className={`truncate text-right ${head ? "" : "font-bold"}`}>{b}</span>
    </div>
  );
}
