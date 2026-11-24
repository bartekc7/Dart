import { DartboardHeat, fieldLabel } from "./DartboardHeat";

/** Tarcza z trafieniami: tylko rzutki wpisywane osobno (z zapisanym polem). */
export function HitMap({
  hits,
  games,
  children,
}: {
  hits: Record<string, number>;
  games: number;
  /** Np. wybór gracza nad tarczą. */
  children?: React.ReactNode;
}) {
  const total = Object.values(hits).reduce((a, b) => a + b, 0);
  const misses = hits["0"] ?? 0;
  const top = Object.entries(hits)
    .filter(([k]) => k !== "0")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-line">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted">Trafienia w tarczę</h3>
      {children}
      {total === 0 ? (
        <p className="text-sm text-muted">
          Tarcza zapełni się po grach wpisywanych „każda rzutka osobno” (ustawienie organizatora w Opcjach).
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            {total} {total === 1 ? "rzutka" : total % 10 >= 2 && total % 10 <= 4 && (total % 100 < 12 || total % 100 > 14) ? "rzutki" : "rzutek"} z{" "}
            {games} {games === 1 ? "gry" : "gier"} wpisywanych „każda rzutka osobno”. Im większa kropka, tym częściej.
          </p>
          <DartboardHeat hits={hits} />
          {top.length > 0 && (
            <ol className="mt-4 grid grid-cols-5 gap-1.5 text-center">
              {top.map(([k, n], i) => (
                <li key={k} className="rounded-xl bg-surface-2 py-2 ring-1 ring-line">
                  <div className="font-mono text-lg font-bold">{fieldLabel(k)}</div>
                  <div className="text-xs text-muted">
                    {i === 0 ? "🎯 " : ""}
                    {pct(n)}
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-center text-sm text-muted">
            Pudła: {misses} ({pct(misses)})
          </p>
        </>
      )}
    </section>
  );
}
