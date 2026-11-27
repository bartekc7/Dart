"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { useDuels } from "./DuelProvider";
import { DuelIcon } from "@/components/ui/DuelIcon";

/** Pasek na ekranie głównym: trwający pojedynek albo moje zaproszenie, które czeka na rywala. */
export function DuelBanner() {
  const duels = useDuels();
  const active = duels?.active;
  if (active && duels.profile) {
    const rival = active.inviter.id === duels.profile.id ? active.rival : active.inviter;
    return (
      <Link
        href={`/1na1/${active.id}`}
        className="flex items-center gap-3 rounded-2xl bg-green/15 px-4 py-3 ring-2 ring-green/60"
      >
        <span className="text-2xl" aria-hidden>
          <DuelIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">Pojedynek: Ty vs {rival?.name}</span>
          <span className="block text-sm text-muted">trwa gra do {active.target} · dotknij, żeby wrócić</span>
        </span>
        <span className="text-xl text-muted" aria-hidden>
          ›
        </span>
      </Link>
    );
  }
  if (duels?.outgoing) {
    return (
      <Link href={`/1na1/${duels.outgoing.id}`} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
        <span className="text-2xl" aria-hidden>
          ⏳
        </span>
        <span className="flex-1 font-semibold">Czekasz na odpowiedź rywala</span>
        <span className="text-xl text-muted" aria-hidden>
          ›
        </span>
      </Link>
    );
  }
  return null;
}

/** Wejście do gier 1 na 1 (obok treningu). */
export function DuelButton({ className = "" }: { className?: string }) {
  return (
    <ButtonLink href="/1na1" variant="secondary" className={`min-h-12 text-base ${className}`}>
      <DuelIcon /> 1 na 1
    </ButtonLink>
  );
}
