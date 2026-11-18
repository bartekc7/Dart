"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

export type Poll<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: ApiError };

/**
 * Pyta API co `everyMs`, ale tylko gdy ekran jest widoczny
 * (zablokowany telefon nie zużywa transferu). Po powrocie odświeża od razu.
 */
export function usePoll<T>(path: string | null, everyMs: number): Poll<T> {
  const [state, setState] = useState<Poll<T>>({ status: "loading" });
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      clearTimeout(timer);
      if (document.visibilityState === "visible") {
        try {
          const data = await api<T>(path!);
          const json = JSON.stringify(data);
          // Ten sam wynik = bez ponownego renderowania.
          if (alive && json !== last.current) {
            last.current = json;
            setState({ status: "ready", data });
          }
        } catch (e) {
          last.current = null;
          if (alive) setState({ status: "error", error: e as ApiError });
        }
      }
      if (alive) timer = setTimeout(tick, everyMs);
    }

    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [path, everyMs]);

  return state;
}
