import Link from "next/link";
import type { Me } from "@/lib/server/league";

const iconLink =
  "flex size-11 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink active:bg-surface-2";

/** Nagłówek startu: logo, nazwa ligi i ikony (liga/zaproszenie, opcje). */
export function HomeHeader({ me }: { me?: Me | null }) {
  return (
    <header className="flex items-center gap-3 pt-2">
      <svg viewBox="0 0 64 64" className="size-11 shrink-0 drop-shadow-lg" aria-hidden>
        <circle cx="32" cy="32" r="30" fill="#e23b3b" />
        <circle cx="32" cy="32" r="22" fill="#f2e3b6" />
        <circle cx="32" cy="32" r="14" fill="#1f9d55" />
        <circle cx="32" cy="32" r="6" fill="#e23b3b" />
      </svg>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold tracking-tight">{me ? me.league.name : "Dart"}</h1>
        <p className="truncate text-sm text-muted">
          {me ? `Grasz jako ${me.member.name}` : "Licznik punktów do równego"}
        </p>
      </div>
      {me && (
        <Link href="/liga" aria-label="Liga: gracze i zaproszenie" title="Zaproś do ligi" className={iconLink}>
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
          </svg>
        </Link>
      )}
      <Link href="/opcje" aria-label="Opcje" className={iconLink}>
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      </Link>
    </header>
  );
}
