import type { Achievement, Tier } from "@/lib/game/achievements";

/** Kolor rodzaju osiągnięcia (ramka odznaki, nagłówki w galerii). */
export const TIER_COLOR: Record<Tier, string> = {
  basic: "#8a9a90",
  short: "#3b82f6",
  special: "#a855f7",
  long: "#f59e0b",
  legend: "#eab308",
};

/** Odznaka osiągnięcia: ikona w ramce w kolorze rodzaju; zablokowana jest szara. */
export function AchBadge({ a, locked, small }: { a: Achievement; locked?: boolean; small?: boolean }) {
  const color = TIER_COLOR[a.tier];
  const size = small ? "size-10 rounded-xl text-xl" : "size-11 rounded-2xl text-2xl";
  if (locked) {
    return (
      <span aria-hidden className={`${size} flex shrink-0 items-center justify-center border-2 border-dashed border-muted/60 grayscale`}>
        <span className="opacity-60">{a.icon}</span>
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`${size} flex shrink-0 items-center justify-center border-2`}
      style={
        a.tier === "legend"
          ? { background: "linear-gradient(135deg, #fde68a, #eab308 60%, #a16207)", borderColor: "#fde68a" }
          : { backgroundColor: `color-mix(in oklab, ${color} 22%, transparent)`, borderColor: color }
      }
    >
      {a.icon}
    </span>
  );
}

/** Mały licznik osiągnięć zdobytych w tej grze (przy nazwie gracza). */
export function AchCount({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="shrink-0 rounded-full bg-[#eab308]/20 px-1.5 text-xs font-bold text-ink" title="Osiągnięcia w tej grze">
      🏆 {n}
    </span>
  );
}
