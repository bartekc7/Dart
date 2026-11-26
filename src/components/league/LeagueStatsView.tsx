"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayerDot } from "@/components/ui/PlayerDot";
import { api } from "@/lib/api";
import { playerColor } from "@/lib/colors";
import {
  formatDuration,
  gamesByWeekday,
  MIN_SERIES,
  type LeagueRecord,
  type LeagueStats,
} from "@/lib/game/leagueStats";
import { useLeague } from "./LeagueProvider";
import { HitMap } from "./HitMap";
import { Loading } from "./StatusScreens";

const num = (n: number, digits = 1) => n.toFixed(digits).replace(".", ",");
const DAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

function day(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" }) : "";
}

function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many;
}

const title = "mb-2 text-sm font-semibold uppercase tracking-wider text-muted";

/** Statystyki całej ligi: liczby, rekordy, tarcza, czas gier, dni gry i tabela graczy. */
export function LeagueStatsView() {
  const { state } = useLeague();
  const myId = state.status === "ready" ? state.data.me?.member.id : undefined;
  const [stats, setStats] = useState<LeagueStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<LeagueStats>("/api/league/stats")
      .then((s) => alive && setStats(s))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="py-10 text-center text-muted">{error}</p>;
  if (!stats) return <Loading />;
  if (stats.games === 0)
    return (
      <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
        Brak gier ligowych. Statystyki pojawią się po pierwszej grze co najmniej dwóch graczy.
      </p>
    );

  const byId = new Map(stats.players.map((p) => [p.id, p]));
  const tiles = [
    { label: "Gry", value: String(stats.games) },
    { label: "Śr. na serię", value: num(stats.avgPerSeries) },
    {
      label: "Przekroczenia",
      value: stats.series ? `${Math.round((stats.busts / stats.series) * 100)}%` : "–",
    },
  ];

  const hitters = stats.players.filter((p) => stats.hitsBy[p.id]);
  const shownHits = who ? (stats.hitsBy[who] ?? {}) : stats.hits;
  const shownGames = who ? (stats.hitGamesBy[who] ?? 0) : stats.hitGames;

  return (
    <>
      <section aria-label="Podsumowanie" className="grid grid-cols-3 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col items-center rounded-2xl bg-surface px-2 py-3 text-center ring-1 ring-line">
            <span className="font-mono text-2xl font-bold tabular-nums">{t.value}</span>
            <span className="mt-0.5 text-xs leading-tight text-muted">{t.label}</span>
          </div>
        ))}
      </section>

      <Records stats={stats} byId={byId} />

      <HitMap hits={shownHits} games={shownGames}>
        {hitters.length > 0 && (
          <div className="-mx-1 mb-3 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Czyja tarcza">
            <Chip active={who === null} onClick={() => setWho(null)}>
              Cała liga
            </Chip>
            {hitters.map((p) => (
              <Chip key={p.id} active={who === p.id} onClick={() => setWho(p.id)}>
                <PlayerDot color={playerColor(p.color)} icon={p.icon} />
                {p.name}
              </Chip>
            ))}
          </div>
        )}
      </HitMap>

      <Durations stats={stats} />
      <Weekdays playedAt={stats.playedAt} />

      <section aria-labelledby="players-title">
        <h2 id="players-title" className={title}>
          Gracze · wszystkie gry
        </h2>
        <ul className="flex flex-col gap-1.5">
          {stats.players.map((p) => (
            <li key={p.id}>
              <Link
                href={`/gracz/${p.id}`}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 active:opacity-70 ${p.id === myId ? "bg-cream/15" : "bg-surface"}`}
              >
                <PlayerDot color={playerColor(p.color)} icon={p.icon} />
                <span className={`min-w-0 flex-1 truncate ${p.id === myId ? "font-bold" : "font-medium"}`}>{p.name}</span>
                <span className="whitespace-nowrap text-right text-xs text-muted">
                  <b className="font-mono text-sm text-ink tabular-nums">{p.wins}</b>/{p.games} wygr.
                </span>
                <span className="w-16 whitespace-nowrap text-right text-xs text-muted">
                  <b className="font-mono text-sm text-ink tabular-nums">{num(p.avgPerSeries)}</b> śr.
                </span>
                <span className="text-muted">›</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">„śr.” to średnio punktów na serię. Dotknij gracza po jego kartę.</p>
      </section>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${
        active ? "bg-ink text-board ring-ink" : "bg-surface-2 ring-line"
      }`}
    >
      {children}
    </button>
  );
}

function Records({ stats, byId }: { stats: LeagueStats; byId: Map<string, LeagueStats["players"][number]> }) {
  const { bestSeries, fastestWin, mostWins, bestAverage } = stats.records;
  const rows: { icon: string; label: string; rec?: LeagueRecord; value: (r: LeagueRecord) => string; note?: (r: LeagueRecord) => string }[] = [
    { icon: "🏆", label: "Najwięcej wygranych", rec: mostWins, value: (r) => String(r.value) },
    {
      icon: "🔥",
      label: "Najlepsza seria",
      rec: bestSeries,
      value: (r) => String(r.value),
      note: (r) => day(r.at),
    },
    {
      icon: "⚡",
      label: "Najszybsza wygrana",
      rec: fastestWin,
      value: (r) => `${r.value} ${plural(r.value, "seria", "serie", "serii")}`,
      note: (r) => `do ${r.target} · ${day(r.at)}`,
    },
    {
      icon: "🎯",
      label: "Najlepsza średnia",
      rec: bestAverage,
      value: (r) => num(r.value),
      note: () => `na serię, min. ${MIN_SERIES} serii`,
    },
  ];
  const shown = rows.filter((r) => r.rec);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="records-title">
      <h2 id="records-title" className={title}>
        Rekordy ligi
      </h2>
      <ul className="flex flex-col gap-1.5">
        {shown.map(({ icon, label, rec, value, note }) => {
          const p = byId.get(rec!.memberId);
          return (
            <li key={label}>
              <Link href={`/gracz/${rec!.memberId}`} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 active:opacity-70">
                <span className="w-7 text-center text-xl" aria-hidden>
                  {icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted">{label}</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    {p && <PlayerDot color={playerColor(p.color)} icon={p.icon} />}
                    <span className="truncate">{p?.name ?? "Usunięty gracz"}</span>
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-mono text-lg font-bold tabular-nums">{value(rec!)}</span>
                  {note && <span className="block text-[11px] text-muted">{note(rec!)}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Durations({ stats }: { stats: LeagueStats }) {
  const d = stats.durations;
  return (
    <section aria-labelledby="time-title" className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <h2 id="time-title" className={title}>
        ⏱ Czas gry
      </h2>
      {d ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Średnio", ms: d.avgMs },
              { label: "Najkrótsza", ms: d.shortestMs },
              { label: "Najdłuższa", ms: d.longestMs },
            ].map((x) => (
              <div key={x.label} className="rounded-xl bg-surface-2 py-2 ring-1 ring-line">
                <div className="font-mono text-lg font-bold tabular-nums">{formatDuration(x.ms)}</div>
                <div className="text-xs text-muted">{x.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            Od pierwszej do ostatniej rzutki, z {d.games} {plural(d.games, "gry", "gier", "gier")}
            {d.games < stats.games ? " (starsze gry nie mają zapisanego czasu)" : ""}.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">
          Czas gier zapisujemy od teraz. Pojawi się tu po pierwszej grze z pomiarem czasu.
        </p>
      )}
    </section>
  );
}

function Weekdays({ playedAt }: { playedAt: string[] }) {
  const days = gamesByWeekday(playedAt);
  const max = Math.max(1, ...days);
  return (
    <section aria-labelledby="days-title" className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <h2 id="days-title" className={title}>
        Kiedy gracie
      </h2>
      <div className="flex h-28 items-end gap-2" role="img" aria-label={DAYS.map((d, i) => `${d}: ${days[i]}`).join(", ")}>
        {days.map((n, i) => (
          <div key={DAYS[i]} className="flex flex-1 flex-col items-center justify-end gap-1 self-stretch">
            <span className="font-mono text-xs tabular-nums text-muted">{n || ""}</span>
            <div
              className={`w-full rounded-t-md ${n === max && n > 0 ? "bg-green" : "bg-surface-2 ring-1 ring-line"}`}
              style={{ height: `${Math.max(4, (n / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2">
        {DAYS.map((d) => (
          <span key={d} className="flex-1 text-center text-xs text-muted">
            {d}
          </span>
        ))}
      </div>
    </section>
  );
}
