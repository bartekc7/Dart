"use client";

import { Button } from "@/components/ui/Button";
import { useLeague } from "./LeagueProvider";

export function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center" aria-busy>
      <span className="size-8 animate-spin rounded-full border-4 border-line border-t-red" />
    </div>
  );
}

export function LoadError({ message, noDatabase }: { message: string; noDatabase: boolean }) {
  const { refresh } = useLeague();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl">{noDatabase ? "🔌" : "😕"}</p>
      <p className="text-lg font-semibold">
        {noDatabase ? "Baza danych nie jest jeszcze podłączona" : "Nie udało się wczytać ligi"}
      </p>
      <p className="max-w-xs text-muted">
        {noDatabase ? "Podłącz Neon w ustawieniach projektu w Vercelu (instrukcja w README)." : message}
      </p>
      <Button variant="secondary" onClick={() => refresh()} className="max-w-xs">
        Spróbuj ponownie
      </Button>
    </div>
  );
}
