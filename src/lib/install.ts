"use client";

import { useEffect, useState } from "react";

/** Zdarzenie Chrome/Androida pozwalające pokazać systemowe okno instalacji. */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    listeners.forEach((l) => l());
  });
}

export type Platform = "ios" | "android" | "other";

/**
 * Czy aplikacja jest już na ekranie głównym, na jakim telefonie działa
 * i (na Androidzie) funkcja otwierająca systemowe okno instalacji.
 */
export function useInstall() {
  const [state, setState] = useState<{ standalone: boolean; platform: Platform; canPrompt: boolean } | null>(null);

  useEffect(() => {
    const update = () => {
      const ua = navigator.userAgent;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const platform: Platform = /iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "other";
      setState({ standalone, platform, canPrompt: deferred !== null });
    };
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  async function install() {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    return outcome === "accepted";
  }

  return { ...state, ready: state !== null, install };
}
