"use client";

import { useState } from "react";
import { useLeague } from "@/components/league/LeagueProvider";
import { Loading } from "@/components/league/StatusScreens";
import { ACHIEVEMENTS, progressOf, TIERS, type AchProgress } from "@/lib/game/achievements";
import { AchBadge, TIER_COLOR } from "./AchBadge";
import { useLeagueAchievements } from "./useAchievements";

type Filter = "all" | "got" | "todo";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "got", label: "Zdobyte" },
  { id: "todo", label: "Do zdobycia" },
];

function when(ms: number) {
  const d = new Date(ms);
  if (d.toDateString() === new Date().toDateString()) return "dziś";
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

/** Galeria osiągnięć gracza: zdobyte w kolorze, pozostałe wyszarzone z postępem. */
export function AchievementGallery({ memberId }: { memberId: string }) {
  const { state } = useLeague();
  const all = useLeagueAchievements(null);
  const [filter, setFilter] = useState<Filter>("all");

  if (!all || state.status !== "ready") return <Loading />;
  const members = state.data.members;
  const name = [...members, ...state.data.inactive].find((m) => m.id === memberId)?.name ?? "Gracz";
  const isMe = state.data.me?.member.id === memberId;
  const mine: AchProgress | undefined = all[memberId];
  const unlocked = mine?.unlocked ?? {};
  const count = Object.keys(unlocked).length;
  const owners = (id: number) => members.filter((m) => all[m.id]?.unlocked[id]).length;

  // Najbliżej zdobycia: niezdobyte z licznikiem, największy procent.
  const closest = mine
    ? ACHIEVEMENTS.filter((a) => !unlocked[a.id])
        .map((a) => ({ a, p: progressOf(mine, a.id) }))
        .filter((x) => x.p && x.p.value > 0)
        .sort((x, y) => y.p!.value / y.p!.goal - x.p!.value / x.p!.goal)[0]
    : undefined;

  return (
    <>
      <section className="flex flex-col gap-2">
        <p className="text-lg">
          <span className="font-bold">{name}</span>
          {isMe && <span className="text-muted"> (Ty)</span>}
        </p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-4xl font-bold tabular-nums">{count}</span>
          <span className="leading-tight">
            <span className="block font-semibold">z {ACHIEVEMENTS.length} zdobytych</span>
            {closest && (
              <span className="block text-sm text-muted">
                najbliżej: {closest.a.name} ({closest.p!.value}/{closest.p!.goal})
              </span>
            )}
          </span>
        </div>
        <span className="block h-2 overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#eab308]"
            style={{ width: `${(count / ACHIEVEMENTS.length) * 100}%` }}
          />
        </span>
        <div role="tablist" className="mt-1 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold ring-1 ${
                filter === f.id ? "bg-ink text-board ring-ink" : "bg-surface ring-line"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {TIERS.map((tier) => {
        const inTier = ACHIEVEMENTS.filter((a) => a.tier === tier.id);
        const shown = inTier.filter((a) => (filter === "all" ? true : filter === "got" ? !!unlocked[a.id] : !unlocked[a.id]));
        if (!shown.length) return null;
        // Zdobyte najpierw (najnowsze na górze), potem reszta w kolejności z listy.
        shown.sort((a, b) => (unlocked[b.id]?.at ?? 0) - (unlocked[a.id]?.at ?? 0));
        return (
          <section key={tier.id} aria-label={tier.name}>
            <h2 className="mb-2 flex items-baseline text-sm font-bold uppercase tracking-wider" style={{ color: TIER_COLOR[tier.id] }}>
              {tier.name}
              <span className="ml-auto font-medium normal-case tracking-normal text-muted">
                {inTier.filter((a) => unlocked[a.id]).length} / {inTier.length}
              </span>
            </h2>
            <ul className="flex flex-col gap-1.5">
              {shown.map((a) => {
                const got = unlocked[a.id];
                const p = !got && mine ? progressOf(mine, a.id) : null;
                const n = owners(a.id);
                return (
                  <li key={a.id} className={`flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-line ${got ? "" : "opacity-70"}`}>
                    <AchBadge a={a} locked={!got} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className={`flex flex-wrap items-center gap-x-1.5 font-bold ${got ? "" : "text-muted"}`}>
                        {a.name}
                        {a.darts && (
                          <span className="rounded-full px-1.5 text-[0.7rem] font-semibold text-muted ring-1 ring-line" title="Liczy się tylko w trybie rzutek">
                            🎯 rzutki
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">{a.desc}</span>
                      {p && p.value > 0 && (
                        <span className="mt-1.5 block">
                          <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
                            <span className="block h-full rounded-full" style={{ width: `${(p.value / p.goal) * 100}%`, backgroundColor: TIER_COLOR[a.tier] }} />
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {p.value.toLocaleString("pl-PL")} / {p.goal.toLocaleString("pl-PL")} {p.unit}
                          </span>
                        </span>
                      )}
                      <span className="mt-1 block text-xs text-muted">
                        {got && `${when(got.at)} · `}
                        {n === 0 ? "nikt jeszcze nie ma" : `ma ${n} z ${members.length} graczy`}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="text-center text-xs text-muted">
        Liczą się gry co najmniej dwóch graczy. Osiągnięcia „🎯 rzutki” wymagają wpisywania każdej rzutki osobno.
      </p>
    </>
  );
}
