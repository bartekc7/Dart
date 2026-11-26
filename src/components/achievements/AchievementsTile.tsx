"use client";

import Link from "next/link";
import { ACHIEVEMENT_BY_ID, ACHIEVEMENTS } from "@/lib/game/achievements";
import { AchBadge } from "./AchBadge";
import { useLeagueAchievements } from "./useAchievements";

/** Kafelek na karcie gracza: ile zdobył i ostatnie odznaki; prowadzi do galerii. */
export function AchievementsTile({ memberId }: { memberId: string }) {
  const all = useLeagueAchievements(null);
  const unlocked = all?.[memberId]?.unlocked ?? {};
  const count = Object.keys(unlocked).length;
  const recent = Object.entries(unlocked)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, 4)
    .map(([id]) => ACHIEVEMENT_BY_ID.get(Number(id))!)
    .filter(Boolean);

  return (
    <Link
      href={`/gracz/${encodeURIComponent(memberId)}/osiagniecia`}
      className="block rounded-2xl bg-surface px-4 py-3 ring-1 ring-line transition active:scale-[0.99]"
    >
      <span className="flex items-center gap-2 text-lg font-bold">
        🏆 Osiągnięcia
        <span className="ml-auto text-base font-semibold text-muted">
          {all ? `${count} z ${ACHIEVEMENTS.length}` : "…"} ›
        </span>
      </span>
      <span className="mt-2 block h-2 overflow-hidden rounded-full bg-surface-2">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#eab308]"
          style={{ width: `${(count / ACHIEVEMENTS.length) * 100}%` }}
        />
      </span>
      {recent.length > 0 && (
        <span className="mt-3 flex items-center gap-2">
          {recent.map((a) => (
            <AchBadge key={a.id} a={a} small />
          ))}
          <span className="ml-1 text-sm text-muted">ostatnio zdobyte</span>
        </span>
      )}
    </Link>
  );
}
