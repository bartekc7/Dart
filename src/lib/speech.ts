"use client";

/**
 * Czyta krótki komunikat po polsku (Web Speech API). Bez wsparcia albo bez
 * polskiego głosu przeglądarka po prostu nic nie powie – gra działa dalej.
 */
export function say(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel(); // nowa seria przerywa poprzedni komunikat
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pl-PL";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("pl"));
    if (voice) u.voice = voice;
    u.rate = 1.05;
    synth.speak(u);
  } catch {}
}
