"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLeague } from "@/components/league/LeagueProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { isGameOver } from "@/lib/game/engine";
import { removeLive } from "@/lib/live/publish";
import { useStoredGame, useStoredTraining } from "@/lib/game/storage";

export function HomeActions() {
  const [game, setGame] = useStoredGame();
  const { state } = useLeague();
  const router = useRouter();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const inProgress = game && !isGameOver(game);

  // Gra z graczami, których nie ma już w lidze (np. po „Wyczyść ligę”), nie da się
  // zapisać – usuwamy ją, żeby nie wisiało „Wróć do gry”.
  const members = state.status === "ready" ? state.data.members : null;
  const stale = !!game && !!members && game.players.some((p) => !members.some((m) => m.id === p.id));
  useEffect(() => {
    if (!stale || !game) return;
    removeLive(game.id);
    setGame(null);
  }, [stale, game, setGame]);

  if (!inProgress || stale) {
    // Zakończona gra zostaje w telefonie (wyniki, cofnięcie), ale „Nowa gra” zaczyna od zera.
    return (
      <>
        <Button
          onClick={() => {
            if (game) setGame(null);
            router.push("/gra");
          }}
        >
          Nowa gra
        </Button>
        <TrainingButton />
      </>
    );
  }

  return (
    <>
      <ButtonLink href="/gra">Wróć do gry</ButtonLink>
      {confirmCancel ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
          <p className="text-sm">
            Anulować trwającą grę? Wszystkie serie przepadną, a gra nie trafi do rankingu.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Nie
            </Button>
            <Button
              onClick={() => {
                removeLive(game.id);
                setGame(null);
                setConfirmCancel(false);
              }}
            >
              Anuluj grę
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
          Anuluj grę
        </Button>
      )}
    </>
  );
}

/** Wejście do treningów solo: mniejsze i obrysowane, żeby nie konkurowało z grą ligową. */
function TrainingButton() {
  const [training] = useStoredTraining();
  return (
    <ButtonLink href="/trening" variant="secondary" className="min-h-12 text-base">
      🎯 {training ? "Wróć do treningu" : "Trening solo"}
    </ButtonLink>
  );
}
