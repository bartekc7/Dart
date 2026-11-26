"use client";

import { useEffect, useRef, useState } from "react";
import type { Achievement } from "@/lib/game/achievements";
import { AchBadge, TIER_COLOR } from "./AchBadge";

type Toast = { key: string; playerId: string; a: Achievement };

const SHOW_MS = 4500;

/**
 * Dymek „nowe osiągnięcie” na górze ekranu. Nie blokuje gry: znika sam
 * albo po dotknięciu. Kilka naraz pokazujemy po kolei (z licznikiem „+N”).
 * Osiągnięcia zdobyte, zanim ekran się otworzył, nie wyskakują ponownie.
 */
export function AchievementToasts({
  earned,
  nameOf,
  onlyFor,
}: {
  earned: Record<string, Achievement[]> | null;
  nameOf: (playerId: string) => string;
  /** Tylko osiągnięcia tego gracza (podgląd na żywo: „Twoje nowe osiągnięcie”). */
  onlyFor?: string;
}) {
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<Toast[]>([]);

  useEffect(() => {
    if (!earned) return;
    const all: Toast[] = [];
    for (const [playerId, list] of Object.entries(earned)) {
      if (onlyFor && playerId !== onlyFor) continue;
      for (const a of list) all.push({ key: `${playerId}:${a.id}`, playerId, a });
    }
    if (!seen.current) {
      seen.current = new Set(all.map((t) => t.key));
      return;
    }
    const fresh = all.filter((t) => !seen.current!.has(t.key));
    if (!fresh.length) return;
    for (const t of fresh) seen.current.add(t.key);
    setQueue((q) => [...q, ...fresh]);
  }, [earned, onlyFor]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]);

  if (!current) return null;
  const color = TIER_COLOR[current.a.tier];
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button
        key={current.key}
        type="button"
        role="status"
        onClick={() => setQueue((q) => q.slice(1))}
        className="ach-toast pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 text-left shadow-2xl ring-1"
        style={{ "--tw-ring-color": color, boxShadow: `0 12px 30px rgb(0 0 0 / 0.35), 0 0 0 4px color-mix(in oklab, ${color} 20%, transparent)` } as React.CSSProperties}
      >
        <AchBadge a={current.a} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-xs font-bold uppercase tracking-wider" style={{ color }}>
            🏆 {onlyFor ? "Twoje nowe osiągnięcie" : `Osiągnięcie · ${nameOf(current.playerId)}`}
          </span>
          <span className="mt-0.5 block text-lg font-bold">{current.a.name}</span>
          <span className="block text-sm text-muted">{current.a.desc}</span>
        </span>
        {queue.length > 1 && (
          <span className="self-start rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: color }}>
            +{queue.length - 1}
          </span>
        )}
      </button>
    </div>
  );
}
