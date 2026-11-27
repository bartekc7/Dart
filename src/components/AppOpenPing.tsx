"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/track";

/**
 * Zgłasza „wejście do aplikacji” przy otwarciu i po powrocie do karty.
 * Serwer i tak liczy je najwyżej raz na pół godziny z jednego telefonu.
 */
export function AppOpenPing() {
  useEffect(() => {
    const ping = () => {
      if (!window.location.pathname.startsWith("/admin")) trackEvent("app_open");
    };
    ping();
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  return null;
}
