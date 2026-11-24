"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePlayerColors } from "@/components/league/LeagueProvider";
import { PlayerDot } from "@/components/ui/PlayerDot";
import type { RankingRow } from "@/lib/game/history";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Ranking graczy ligi z ostatnich gier. */
export function Ranking({ rows, games, myId }: { rows: RankingRow[]; games: number; myId?: string }) {
  const colorOf = usePlayerColors();
  const router = useRouter();
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
          Dotknij gracza po statystyki ·{" "}
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
          {rows.map((r, i) => {
            const me = r.id === myId;
            return (
              <tr
                key={r.id ?? r.name}
                onClick={r.id ? () => router.push(`/gracz/${r.id}`) : undefined}
                className={`${me ? "bg-cream/15" : "bg-surface"} ${r.id ? "cursor-pointer active:opacity-70" : ""}`}
              >
                <td className={`rounded-l-xl py-2 pl-3 text-center ${me ? "shadow-[inset_3px_0_0_var(--color-cream)]" : ""}`}>
                  {MEDALS[i] ?? <span className="font-mono text-sm text-muted">{i + 1}.</span>}
                </td>
                <td className="py-2 pl-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <PlayerDot color={colorOf(r.id)} />
                    {r.id ? (
                      <Link
                        href={`/gracz/${r.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`truncate ${me ? "font-bold" : "font-medium"}`}
                      >
                        {r.name}
                      </Link>
                    ) : (
                      <span className={`truncate ${me ? "font-bold" : "font-medium"}`}>{r.name}</span>
                    )}
                    {me && (
                      <span className="shrink-0 rounded-full bg-cream px-1.5 text-[11px] font-bold text-board">TY</span>
                    )}
                    <Trend trend={r.trend} />
                  </span>
                </td>
                <td className="px-1 text-right font-mono tabular-nums text-muted">{r.games}</td>
                <td className="px-1 text-right font-mono tabular-nums">{r.wins}</td>
                <td className="rounded-r-xl pr-3 text-right font-mono font-bold tabular-nums">
                  {r.avgPlace.toFixed(1).replace(".", ",")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <Link
          href="/statystyki"
          className="rounded-xl bg-surface py-2.5 text-center text-sm font-semibold ring-1 ring-line active:opacity-70"
        >
          📊 Statystyki ligi
        </Link>
        <Link
          href="/historia"
          className="rounded-xl bg-surface py-2.5 text-center text-sm font-semibold ring-1 ring-line active:opacity-70"
        >
          🕑 Historia gier
        </Link>
      </div>
    </section>
  );
}

/** Zmiana pozycji po ostatniej grze. */
function Trend({ trend }: { trend: RankingRow["trend"] }) {
  if (trend === undefined || trend === 0) return null;
  if (trend === "new") return <span className="shrink-0 text-[11px] font-semibold text-muted">nowy</span>;
  const up = trend > 0;
  return (
    <span
      className={`shrink-0 text-xs font-bold tabular-nums ${up ? "text-green" : "text-red"}`}
      aria-label={up ? `awans o ${trend}` : `spadek o ${-trend}`}
      title="Zmiana po ostatniej grze"
    >
      {up ? "▲" : "▼"}
      {Math.abs(trend)}
    </span>
  );
}
