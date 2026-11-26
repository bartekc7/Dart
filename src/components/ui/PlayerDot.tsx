/**
 * Znak gracza: kropka w jego kolorze albo – gdy wybrał – ikonka w tym samym
 * miejscu (rozpoznawanie graczy na pierwszy rzut oka). Stała szerokość, żeby
 * nazwy graczy z kropką i z ikonką były wyrównane.
 */
export function PlayerDot({ color, icon, big }: { color: string; icon?: string | null; big?: boolean }) {
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center ${big ? "w-7" : "w-5"}`}>
      {icon ? (
        <span className={`leading-none ${big ? "text-2xl" : "text-lg"}`}>{icon}</span>
      ) : (
        <span className={`rounded-full ${big ? "size-3.5" : "size-2.5"}`} style={{ backgroundColor: color }} />
      )}
    </span>
  );
}
