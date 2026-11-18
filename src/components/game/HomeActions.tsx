"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { isGameOver } from "@/lib/game/engine";
import { removeLive } from "@/lib/live/publish";
import { useStoredGame } from "@/lib/game/storage";

export function HomeActions() {
  const [game, setGame] = useStoredGame();
  const router = useRouter();
  const inProgress = game && !isGameOver(game);

  if (!inProgress) {
    // Zakończona gra zostaje w telefonie (wyniki, cofnięcie), ale „Nowa gra” zaczyna od zera.
    return (
      <Button
        onClick={() => {
          if (game) setGame(null);
          router.push("/gra");
        }}
      >
        Nowa gra
      </Button>
    );
  }

  return (
    <>
      <ButtonLink href="/gra">Wróć do gry</ButtonLink>
      <Button
        variant="secondary"
        onClick={() => {
          removeLive(game.id);
          setGame(null);
          router.push("/gra");
        }}
      >
        Zacznij nową grę
      </Button>
    </>
  );
}
