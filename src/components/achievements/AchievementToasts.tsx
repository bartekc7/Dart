"use client";

import { useEffect, useRef, useState } from "react";
import type { Achievement } from "@/lib/game/achievements";
import { formatRecord, recordLabel, type RecordEvent } from "@/lib/game/records";
import { AchBadge, TIER_COLOR } from "./AchBadge";

/** Złoty kolor rekordów (osiągnięcia mają kolory rodzajów). */
export const RECORD_COLOR = "#e7b53c";

/** Jeden dymek: osiągnięcie albo rekord, plus rekordy z tej samej serii jako pasek na dole. */
type Toast = { key: string; playerId: string; a?: Achievement; rec?: RecordEvent; extra: RecordEvent[] };

const SHOW_MS = 4500;

const recKey = (r: RecordEvent) => `${r.memberId}:${r.key}:${r.value}`;

/**
 * Dymek „nowe osiągnięcie” / „nowy rekord” na górze ekranu. Nie blokuje gry: znika sam
 * albo po dotknięciu. Kilka naraz pokazujemy po kolei (z licznikiem „+N”).
 * Osiągnięcie i rekord tego samego gracza z tej samej serii to jeden dymek
 * (rekord jako złoty pasek), żeby nie wyskakiwały dwa naraz.
 * To, co było zdobyte, zanim ekran się otworzył, nie wyskakuje ponownie.
 */
export function AchievementToasts({
  earned,
  records,
  nameOf,
  holderName,
  onlyFor,
}: {
  earned: Record<string, Achievement[]> | null;
  records?: RecordEvent[] | null;
  nameOf: (playerId: string) => string;
  /** Nazwa poprzedniego rekordzisty (może nie grać w tej grze). */
  holderName?: (playerId: string) => string;
  /** Podgląd na żywo: osiągnięcia i rekordy osobiste tylko tego gracza, rekordy ligi wszystkich. */
  onlyFor?: string;
}) {
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<Toast[]>([]);

  useEffect(() => {
    if (!earned || (records !== undefined && !records)) return;
    const achs: Toast[] = [];
    for (const [playerId, list] of Object.entries(earned)) {
      if (onlyFor && playerId !== onlyFor) continue;
      for (const a of list) achs.push({ key: `${playerId}:${a.id}`, playerId, a, extra: [] });
    }
    const recs = (records ?? []).filter((r) => !onlyFor || r.memberId === onlyFor || r.scope === "league");
    if (!seen.current) {
      seen.current = new Set([...achs.map((t) => t.key), ...recs.map(recKey)]);
      return;
    }
    const fresh = achs.filter((t) => !seen.current!.has(t.key));
    const freshRecs = recs.filter((r) => !seen.current!.has(recKey(r)));
    if (!fresh.length && !freshRecs.length) return;
    for (const t of fresh) seen.current.add(t.key);
    for (const r of freshRecs) seen.current.add(recKey(r));
    // Nowe naraz = ta sama seria: rekord dokładamy do dymka osiągnięcia tego gracza.
    const out = [...fresh];
    for (const r of freshRecs) {
      const host = out.find((t) => t.playerId === r.memberId);
      if (host) host.extra.push(r);
      else out.push({ key: recKey(r), playerId: r.memberId, rec: r, extra: [] });
    }
    setQueue((q) => [...q, ...out]);
  }, [earned, records, onlyFor]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]);

  if (!current) return null;
  const color = current.a ? TIER_COLOR[current.a.tier] : RECORD_COLOR;
  const mine = !!onlyFor && current.playerId === onlyFor;
  const holder = holderName ?? nameOf;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button
        key={current.key}
        type="button"
        role="status"
        onClick={() => setQueue((q) => q.slice(1))}
        className="ach-toast pointer-events-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-surface text-left shadow-2xl ring-1"
        style={{ "--tw-ring-color": color, boxShadow: `0 12px 30px rgb(0 0 0 / 0.35), 0 0 0 4px color-mix(in oklab, ${color} 20%, transparent)` } as React.CSSProperties}
      >
        <span className="flex w-full items-center gap-3 px-3.5 py-3">
          {current.a ? (
            <AchBadge a={current.a} />
          ) : (
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 text-2xl"
              style={{ borderColor: RECORD_COLOR, backgroundColor: `color-mix(in oklab, ${RECORD_COLOR} 20%, transparent)` }}
            >
              📈
            </span>
          )}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-xs font-bold uppercase tracking-wider" style={{ color }}>
              {current.a
                ? `🏆 ${mine ? "Twoje nowe osiągnięcie" : `Osiągnięcie · ${nameOf(current.playerId)}`}`
                : `📈 ${current.rec!.scope === "league" ? "Nowy rekord ligi" : "Nowy rekord osobisty"}${mine ? "" : ` · ${nameOf(current.playerId)}`}`}
            </span>
            {current.a ? (
              <>
                <span className="mt-0.5 block text-lg font-bold">{current.a.name}</span>
                <span className="block text-sm text-muted">{current.a.desc}</span>
              </>
            ) : (
              <>
                <span className="mt-0.5 block text-lg font-bold">
                  {recordLabel(current.rec!.key)}: <span className="font-mono">{formatRecord(current.rec!.key, current.rec!.value)}</span>
                </span>
                <span className="block text-sm text-muted">
                  Poprzedni: {formatRecord(current.rec!.key, current.rec!.prev.value)}
                  {current.rec!.scope === "league" && ` · ${holder(current.rec!.prev.memberId)}`}
                </span>
              </>
            )}
          </span>
          {queue.length > 1 && (
            <span className="self-start rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: color }}>
              +{queue.length - 1}
            </span>
          )}
        </span>
        {current.extra.map((r) => (
          <span
            key={recKey(r)}
            className="block w-full border-t px-3.5 py-2 text-sm font-bold"
            style={{ color: RECORD_COLOR, borderColor: `color-mix(in oklab, ${RECORD_COLOR} 45%, transparent)`, backgroundColor: `color-mix(in oklab, ${RECORD_COLOR} 14%, transparent)` }}
          >
            📈 …i {r.scope === "league" ? "nowy rekord ligi" : "nowy rekord osobisty"}: {recordLabel(r.key).toLowerCase()}{" "}
            {formatRecord(r.key, r.value)} <span className="font-medium text-muted">(było {formatRecord(r.key, r.prev.value)})</span>
          </span>
        ))}
      </button>
    </div>
  );
}
