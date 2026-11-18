"use client";

import { useInstall } from "@/lib/install";

/** Krótka instrukcja „Dodaj do ekranu głównego” dopasowana do telefonu. */
export function InstallGuide() {
  const { ready, standalone, platform, canPrompt, install } = useInstall();
  if (!ready) return null;

  return (
    <section id="instaluj" aria-labelledby="install-title" className="flex flex-col gap-3">
      <h2 id="install-title" className="text-sm font-semibold uppercase tracking-wider text-muted">
        Ikona na ekranie głównym
      </h2>
      {standalone ? (
        <p className="rounded-2xl bg-surface p-4 ring-1 ring-line">✓ Dart jest już na ekranie głównym.</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <p>Dodaj Dart do ekranu głównego, a otworzy się jak aplikacja: na pełnym ekranie, jednym dotknięciem.</p>
          {canPrompt && (
            <button
              type="button"
              onClick={install}
              className="min-h-12 rounded-2xl bg-green font-semibold text-white active:scale-[0.98]"
            >
              Dodaj do ekranu głównego
            </button>
          )}
          {(platform === "ios" || platform === "other") && (
            <Steps
              title="iPhone (Safari)"
              steps={[
                <>Dotknij <ShareIcon /> <strong>Udostępnij</strong> na dole ekranu.</>,
                <>Przewiń i wybierz <strong>Do ekranu początkowego</strong>.</>,
                <>Potwierdź przyciskiem <strong>Dodaj</strong>.</>,
              ]}
            />
          )}
          {(platform === "android" || platform === "other") && !canPrompt && (
            <Steps
              title="Android (Chrome)"
              steps={[
                <>Dotknij <strong>⋮</strong> w prawym górnym rogu.</>,
                <>Wybierz <strong>Dodaj do ekranu głównego</strong> albo <strong>Zainstaluj aplikację</strong>.</>,
              ]}
            />
          )}
        </div>
      )}
    </section>
  );
}

function Steps({ title, steps }: { title: string; steps: React.ReactNode[] }) {
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-muted">{title}</p>
      <ol className="flex list-decimal flex-col gap-1 pl-5">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline size-5 -translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
