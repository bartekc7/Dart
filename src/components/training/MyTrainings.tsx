"use client";

import { useState } from "react";
import { Loading } from "@/components/league/StatusScreens";
import { RECORD_COLOR } from "@/components/achievements/AchievementToasts";
import { ButtonLink } from "@/components/ui/Button";
import { AIM_TARGETS, formatScore, MODE_BY_ID, MODES, trainingStats, variantLabel, type TrainingMode } from "@/lib/training";
import { formatAvg, Trend } from "./TrainingScreen";
import { useMyTrainings } from "./useTrainings";

type Tab = { mode: TrainingMode; variant: string };

const when = (ms: number) => {
  const d = new Date(ms);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const time = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `dziś ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `wczoraj ${time}`;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
};

/** Statystyki treningów: tylko moje, osobno od gier ligowych. */
export function MyTrainings() {
  const { list, error } = useMyTrainings();
  const [tab, setTab] = useState<Tab>({ mode: "aim", variant: "20" });
  if (error && !list) return <p className="py-10 text-center text-muted">{error}</p>;
  if (!list) return <Loading />;
  if (!list.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-muted">Nie masz jeszcze żadnego treningu.</p>
        <ButtonLink href="/trening" className="max-w-xs">
          🎯 Zacznij trening
        </ButtonLink>
      </div>
    );
  }

  const stats = trainingStats(list, tab.mode, tab.variant);
  const recent = list
    .filter((t) => t.mode === tab.mode && t.variant === tab.variant)
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Widzisz je tylko Ty. Nie liczą się do rankingu, statystyk ligi ani osiągnięć.</p>
      <div role="tablist" aria-label="Tryb" className="grid grid-cols-3 gap-1.5">
        {MODES.map((m) => {
          const active = tab.mode === m.mode;
          return (
            <button
              key={m.mode}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab({ mode: m.mode, variant: m.mode === "aim" ? "20" : "" })}
              className={`truncate rounded-full px-2 py-2 text-[0.95rem] font-semibold ring-1 ${active ? "bg-ink text-board ring-ink" : "bg-surface-2 ring-line"}`}
            >
              {m.icon} {m.mode === "clock" ? "Dookoła" : m.name}
            </button>
          );
        })}
      </div>
      {tab.mode === "aim" && (
        <div role="tablist" aria-label="Pole" className="grid grid-cols-3 gap-1.5">
          {AIM_TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab.variant === t.id}
              onClick={() => setTab({ mode: "aim", variant: t.id })}
              className={`rounded-xl py-1.5 font-semibold ring-1 ${tab.variant === t.id ? "bg-surface ring-cream" : "bg-surface-2 text-muted ring-line"}`}
            >
              W {t.label}
            </button>
          ))}
        </div>
      )}

      {stats.count === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
          Brak treningów w tym trybie.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2">
            <Tile label="treningów" value={String(stats.count)} />
            <Tile label="najlepiej" value={stats.best ? formatScore(tab.mode, stats.best.score) : "–"} gold />
            <Tile label={`śr. z ost. ${Math.min(10, stats.count)}`} value={stats.recentAvg === null ? "–" : formatAvg(tab.mode, stats.recentAvg)} />
          </dl>
          {stats.trend !== null && (
            <p className="-mt-2 text-sm text-muted">
              W porównaniu z 10 wcześniejszymi: <Trend mode={tab.mode} trend={stats.trend} />
            </p>
          )}
          {stats.series.length >= 2 && (
            <section aria-labelledby="progress-title">
              <h2 id="progress-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
                Postęp · {MODE_BY_ID[tab.mode].name}
                {tab.mode === "aim" && ` w ${variantLabel(tab.variant)}`}
              </h2>
              <Chart values={stats.series} lowerIsBetter={MODE_BY_ID[tab.mode].lowerIsBetter} />
            </section>
          )}
          <section aria-labelledby="recent-title">
            <h2 id="recent-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
              Ostatnie
            </h2>
            <ul className="flex flex-col gap-1.5">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-line">
                  <span className="flex-1">{when(t.finishedAt)}</span>
                  <span
                    className="font-mono font-bold tabular-nums"
                    style={t.id === stats.best?.id ? { color: RECORD_COLOR } : undefined}
                  >
                    {formatScore(t.mode, t.score)}
                    {t.id === stats.best?.id && " 👑"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      <ButtonLink href="/trening" variant="secondary">
        🎯 Nowy trening
      </ButtonLink>
    </div>
  );
}

function Tile({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface px-2 py-3 text-center ring-1 ring-line">
      <dd className="font-mono text-2xl font-bold tabular-nums" style={gold ? { color: RECORD_COLOR } : undefined}>
        {value}
      </dd>
      <dt className="text-xs leading-tight text-muted">{label}</dt>
    </div>
  );
}

/** Prosty wykres liniowy wyników (od najstarszego). Lepszy wynik zawsze wyżej. */
function Chart({ values, lowerIsBetter }: { values: number[]; lowerIsBetter: boolean }) {
  const W = 320;
  const H = 120;
  const pad = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, values.length - 1);
  const y = (v: number) => {
    const t = (v - min) / span;
    return pad + (lowerIsBetter ? t : 1 - t) * (H - 2 * pad);
  };
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values.length - 1;
  return (
    <div className="rounded-2xl bg-surface p-3 ring-1 ring-line">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Wyniki: ${values.join(", ")}`}>
        <line x1={pad} x2={W - pad} y1={H / 2} y2={H / 2} stroke="var(--c-line)" strokeDasharray="4 4" />
        <polyline points={pts} fill="none" stroke="var(--c-green)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 5 : 3} fill={i === last ? RECORD_COLOR : "var(--c-green)"} />
        ))}
      </svg>
      <p className="flex justify-between text-xs text-muted">
        <span>{values.length} treningów temu</span>
        <span>ostatni</span>
      </p>
    </div>
  );
}
