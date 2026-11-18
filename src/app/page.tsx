import { HomeActions } from "@/components/game/HomeActions";
import { Ranking } from "@/components/game/Ranking";

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dart</h1>
          <p className="text-sm text-muted">Licznik punktów do równego</p>
        </div>
      </header>

      <div className="flex-1">
        <Ranking />
      </div>

      <nav className="sticky bottom-0 flex flex-col gap-3 bg-board pt-2">
        <HomeActions />
      </nav>
    </main>
  );
}
