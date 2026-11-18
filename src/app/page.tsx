import { HomeScreen } from "@/components/league/HomeScreen";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex items-center gap-3 pt-2">
        <svg viewBox="0 0 64 64" className="size-12 drop-shadow-lg" aria-hidden>
          <circle cx="32" cy="32" r="30" fill="#e23b3b" />
          <circle cx="32" cy="32" r="22" fill="#f2e3b6" />
          <circle cx="32" cy="32" r="14" fill="#1f9d55" />
          <circle cx="32" cy="32" r="6" fill="#e23b3b" />
        </svg>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Dart</h1>
          <p className="text-sm text-muted">Licznik punktów do równego</p>
        </div>
        <Link
          href="/opcje"
          aria-label="Opcje"
          className="flex size-11 items-center justify-center self-start rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </Link>
      </header>

      <HomeScreen />
    </main>
  );
}
