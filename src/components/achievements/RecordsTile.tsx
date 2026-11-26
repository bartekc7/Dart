"use client";

import { useMemberName } from "@/components/league/LeagueProvider";
import { formatRecord, recordLabel, recordOrder } from "@/lib/game/records";
import { RECORD_COLOR } from "./AchievementToasts";
import { useLeagueRecords } from "./useAchievements";

const date = (ms: number) => new Date(ms).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });

/** „Rekordy” na karcie gracza: jego najlepsze wartości i rekord ligi do pobicia. */
export function RecordsTile({ memberId }: { memberId: string }) {
  const records = useLeagueRecords();
  const nameOf = useMemberName();
  if (!records) return null;
  const mine = records.personal[memberId] ?? {};
  const keys = Object.keys(mine).sort((a, b) => recordOrder(a) - recordOrder(b));
  if (!keys.length) return null;
  return (
    <section aria-labelledby="records-title">
      <h2 id="records-title" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
        📈 Rekordy
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
        {keys.map((k) => {
          const r = mine[k];
          const lg = records.league[k];
          const holds = lg && lg.memberId === memberId && lg.value === r.value;
          return (
            <li key={k} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block font-semibold">{recordLabel(k)}</span>
                <span className="block text-sm text-muted">
                  {date(r.at)} ·{" "}
                  {holds ? "rekord ligi 👑" : lg ? `liga: ${formatRecord(k, lg.value)} (${nameOf(lg.memberId)})` : ""}
                </span>
              </span>
              <span className="font-mono text-2xl font-bold tabular-nums" style={holds ? { color: RECORD_COLOR } : undefined}>
                {formatRecord(k, r.value)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
