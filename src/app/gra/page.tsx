import { AppHeader } from "@/components/ui/AppHeader";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Nowa gra – Dart" };

// Krok 2 planu: tu powstanie ekran rozgrywki (gracze, kolejność, cel, wpis serii).
// Logika gry jest już gotowa w src/lib/game/engine.ts.
export default function NewGamePage() {
  return (
    <main className="flex flex-1 flex-col">
      <AppHeader title="Nowa gra" backHref="/" />
      <div className="flex flex-1 flex-col items-center justify-center rounded-3xl bg-surface p-8 text-center ring-1 ring-line">
        <p className="text-5xl">🎯</p>
        <p className="mt-4 text-lg font-semibold">Ekran gry jest w przygotowaniu</p>
        <p className="mt-1 text-muted">
          Wkrótce dodasz tu graczy, ustalisz kolejność i cel, np. 101.
        </p>
      </div>
      <ButtonLink href="/" variant="secondary" className="mt-4">
        Wróć na start
      </ButtonLink>
    </main>
  );
}
