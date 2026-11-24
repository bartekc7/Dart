import { formatDuration } from "@/lib/game/engine";

/**
 * Licznik przy graczu, który już skończył, a reszta gra dalej:
 * ile czasu minęło od jego serii kończącej.
 */
export function SinceFinish({ at, now }: { at: number | null; now: number }) {
  if (at === null) return null;
  return (
    <span className="block truncate text-xs font-medium text-muted tabular-nums land:text-sm" title="Czas od mety">
      ⏱ +{formatDuration(now - at)} od mety
    </span>
  );
}
