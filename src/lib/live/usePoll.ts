"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

/** Gdy trwa gra: zmiany u innych widać po ok. 1–2 s. */
export const FAST_POLL_MS = 1500;
/** Gdy nic się nie dzieje: rzadziej, żeby nie zużywać limitów serwera i bazy. */
export const IDLE_POLL_MS = 6000;

export type Poll<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: ApiError };

/**
 * Pyta API co `everyMs`, ale tylko gdy ekran jest widoczny
 * (zablokowany telefon nie zużywa transferu). Po powrocie do aplikacji,
 * odblokowaniu telefonu albo odzyskaniu sieci odświeża od razu.
 * `everyMs` może zależeć od ostatnich danych, np. szybciej, gdy trwa gra.
 */
export function usePoll<T>(path: string | null, everyMs: number | ((data: T | null) => number)): Poll<T> {
  const [state, setState] = useState<Poll<T>>({ status: "loading" });
  const last = useRef<string | null>(null);
  const interval = useRef(everyMs);
  useEffect(() => {
    interval.current = everyMs;
  });

  useEffect(() => {
    if (!path) return;
    let alive = true;
    let busy = false;
    let data: T | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      clearTimeout(timer);
      // Jedno zapytanie naraz (np. „focus” i „visibilitychange” przychodzą razem).
      if (busy) return;
      if (document.visibilityState === "visible") {
        busy = true;
        try {
          data = await api<T>(path!);
          const json = JSON.stringify(data);
          // Ten sam wynik = bez ponownego renderowania.
          if (alive && json !== last.current) {
            last.current = json;
            setState({ status: "ready", data });
          }
        } catch (e) {
          last.current = null;
          if (alive) setState({ status: "error", error: e as ApiError });
        } finally {
          busy = false;
        }
      }
      const ms = typeof interval.current === "function" ? interval.current(data) : interval.current;
      if (alive) timer = setTimeout(tick, ms);
    }

    const now = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", now);
    window.addEventListener("focus", now);
    window.addEventListener("pageshow", now);
    window.addEventListener("online", now);
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", now);
      window.removeEventListener("focus", now);
      window.removeEventListener("pageshow", now);
      window.removeEventListener("online", now);
    };
  }, [path]);

  return state;
}
