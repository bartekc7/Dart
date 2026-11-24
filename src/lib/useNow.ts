"use client";

import { useEffect, useState } from "react";

/** Bieżący czas odświeżany co sekundę (do liczników czasu), tylko gdy `active`. */
export function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}
