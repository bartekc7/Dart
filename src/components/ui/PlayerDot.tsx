/** Kropka w kolorze gracza (rozpoznawanie graczy na pierwszy rzut oka). */
export function PlayerDot({ color, big }: { color: string; big?: boolean }) {
  return (
    <span
      aria-hidden
      className={`shrink-0 rounded-full ${big ? "size-3.5" : "size-2.5"}`}
      style={{ backgroundColor: color }}
    />
  );
}
