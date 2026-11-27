"use client";

import type { EventType } from "./events";

/** Zgłasza zdarzenie do rejestru (panel admina). Bez czekania i bez komunikatów o błędach. */
export function trackEvent(type: Extract<EventType, "app_open" | "training_start">) {
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Rejestr nie może przeszkadzać w grze.
  }
}
