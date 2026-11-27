"use client";

import { useEffect } from "react";

/**
 * Każdy przycisk w aplikacji po dotknięciu na chwilę błyska (klasa .tap-flash z globals.css),
 * żeby było widać, że stuknięcie zadziałało – także przy bardzo szybkim stuknięciu palcem.
 * Przycisk z atrybutem data-no-flash jest pomijany.
 */
export function TapFlash() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const el = (e.target as Element | null)?.closest?.("button");
      if (!el || (el as HTMLButtonElement).disabled || el.hasAttribute("data-no-flash")) return;
      el.classList.remove("tap-flash");
      void (el as HTMLElement).offsetWidth; // restart animacji przy szybkich kolejnych stuknięciach
      el.classList.add("tap-flash");
    };
    const onEnd = (e: AnimationEvent) => {
      if (e.animationName === "tap-flash") (e.target as Element).classList.remove("tap-flash");
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("animationend", onEnd);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("animationend", onEnd);
    };
  }, []);
  return null;
}
