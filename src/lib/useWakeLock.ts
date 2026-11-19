"use client";

import { useEffect } from "react";

/**
 * Nie pozwala wygasić ekranu, dopóki komponent jest widoczny (np. w trakcie gry).
 * Przeglądarka zwalnia blokadę po schowaniu karty, więc po powrocie bierzemy ją
 * od nowa. Bez wsparcia (starsze przeglądarki) po prostu nic się nie dzieje.
 */
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) next.release().catch(() => {});
        else lock = next;
      } catch {
        // Np. tryb oszczędzania baterii – gra działa dalej, ekran może zgasnąć.
      }
    }

    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
