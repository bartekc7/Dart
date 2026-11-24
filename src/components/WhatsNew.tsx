"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { markSeen, readSeen, shouldShow, unseenReleases, type WhatsNewRelease } from "@/lib/whatsNew";

/** Lista nowości jednego wydania – używana w oknie i na stronie /co-nowego. */
export function ReleaseItems({ release }: { release: WhatsNewRelease }) {
  return (
    <ul className="flex flex-col gap-3">
      {release.items.map((item) => (
        <li key={item.title} className="flex gap-3 rounded-2xl bg-surface-2/60 p-3 ring-1 ring-line">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-board text-2xl ring-1 ring-line"
          >
            {item.icon}
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{item.title}</p>
            <p className="mt-0.5 text-sm leading-snug text-muted">{item.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Okno pokazywane raz po nowej wersji (na ekranie startowym). */
export function WhatsNewPopup() {
  const [releases, setReleases] = useState<WhatsNewRelease[]>([]);

  useEffect(() => {
    const { seen, usedBefore } = readSeen();
    if (shouldShow(seen, usedBefore)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage dostępny dopiero w przeglądarce
      setReleases(unseenReleases(seen));
    } else {
      markSeen();
    }
  }, []);

  useEffect(() => {
    if (!releases.length) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [releases.length]);

  function close() {
    markSeen();
    setReleases([]);
  }

  if (!releases.length) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(88dvh,46rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-line mb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <span aria-hidden className="text-4xl">🎉</span>
          <div className="min-w-0 flex-1">
            <h2 id="whats-new-title" className="text-2xl font-bold tracking-tight">
              Co nowego
            </h2>
            <p className="text-sm text-muted">Aktualizacja z {releases[0].date}</p>
          </div>
          <button
            type="button"
            aria-label="Zamknij"
            onClick={close}
            className="flex size-10 items-center justify-center rounded-full text-muted active:bg-surface-2"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-2">
          {releases.map((r, i) => (
            <div key={r.id} className="flex flex-col gap-2">
              {i > 0 && <p className="text-sm font-semibold text-muted">Wcześniej – {r.date}</p>}
              <ReleaseItems release={r} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 px-5 pt-3 pb-5">
          <button
            type="button"
            onClick={close}
            autoFocus
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-red text-lg font-semibold text-white shadow-lg shadow-red/20 active:scale-[0.98]"
          >
            Super, gramy!
          </button>
          <p className="text-center text-xs text-muted">Zawsze możesz tu wrócić: ⚙️ Opcje › Co nowego</p>
        </div>
      </div>
    </div>
  );
}

/** Wejście w Opcjach. */
export function WhatsNewLink() {
  return (
    <Link
      href="/co-nowego"
      className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface px-4 text-lg ring-1 ring-line active:bg-surface-2"
    >
      <span aria-hidden className="text-2xl">🎉</span>
      <span className="flex-1 font-semibold">Co nowego</span>
      <span aria-hidden className="text-2xl text-muted">›</span>
    </Link>
  );
}
