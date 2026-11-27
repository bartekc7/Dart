/**
 * Znak gier 1 na 1: dwie skrzyżowane rzutki (nie ma takiego emoji).
 * Grot, korpus i trzonek mają kolor tekstu (działa w jasnym i ciemnym motywie
 * oraz na kolorowych kartach), lotki są czerwona i zielona jak pola tarczy.
 * Rozmiar 1em – skaluje się jak emoji, np. klasą text-5xl obok.
 */
export function DuelIcon({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="-1.5 -1.5 27 27"
      width="1em"
      height="1em"
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <Dart angle={-45} flight="#e23b3b" />
      <Dart angle={-135} flight="#1f9d55" />
    </svg>
  );
}

/** Rzutka narysowana poziomo (grot w prawo) i obrócona wokół środka. */
function Dart({ angle, flight }: { angle: number; flight: string }) {
  return (
    <g transform={`rotate(${angle} 12 12)`}>
      {/* lotka */}
      <path d="M7.2 12 L2.6 6.6 L-1.6 6.6 L0.6 12 L-1.6 17.4 L2.6 17.4 Z" fill={flight} />
      {/* trzonek */}
      <rect x="5" y="11" width="8.5" height="2" rx="0.6" fill="currentColor" opacity="0.8" />
      {/* korpus (baryłka) */}
      <rect x="12.6" y="9.9" width="7.6" height="4.2" rx="1.8" fill="currentColor" />
      {/* grot */}
      <path d="M19.8 11.2 L25.2 12 L19.8 12.8 Z" fill="currentColor" />
    </g>
  );
}
