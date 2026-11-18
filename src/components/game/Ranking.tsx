"use client";

import type { RankingRow } from "@/lib/game/history";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Ranking graczy ligi z ostatnich gier. */
export function Ranking({ rows, games, myId }: { rows: RankingRow[]; games: number; myId?: string }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
        Tu pojawi się ranking, gdy rozegracie pierwszą grę.
      </p>
    );
  }

  return (
    <section aria-labelledby="ranking-title">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="ranking-title" className="text-sm font-semibold uppercase tracking-wider text-muted">
          Ranking
        </h2>
        <p className="text-xs text-muted">
          {games === 1 ? "z ostatniej gry" : `z ostatnich ${games} gier`}
        </p>
      </div>
      <table className="w-full table-fixed border-separate border-spacing-y-1.5 text-left">
        <thead className="text-xs text-muted">
          <tr>
            <th className="w-11 font-normal" />
            <th className="pl-2 font-normal">Gracz</th>
            <th className="w-10 px-1 text-right font-normal">Gry</th>
            <th className="w-12 px-1 text-right font-normal">Wygr.</th>
            <th className="w-16 pr-3 text-right font-normal" title="Średnie miejsce">Śr. m.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? r.name} className={r.id === myId ? "bg-surface-2" : "bg-surface"}>
              <td className="rounded-l-xl py-2 pl-3 text-center">
                {MEDALS[i] ?? <span className="font-mono text-sm text-muted">{i + 1}.</span>}
              </td>
              <td className="truncate py-2 pl-2 font-medium">{r.name}</td>
              <td className="px-1 text-right font-mono tabular-nums text-muted">{r.games}</td>
              <td className="px-1 text-right font-mono tabular-nums">{r.wins}</td>
              <td className="rounded-r-xl pr-3 text-right font-mono font-bold tabular-nums">
                {r.avgPlace.toFixed(1).replace(".", ",")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
