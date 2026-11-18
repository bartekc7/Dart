"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { isGameOver } from "@/lib/game/engine";
import { useStoredGame } from "@/lib/game/storage";

export function HomeActions() {
  const [game, setGame] = useStoredGame();
  const router = useRouter();
  const inProgress = game && !isGameOver(game);

  if (!inProgress) return <ButtonLink href="/gra">Nowa gra</ButtonLink>;

  return (
    <>
      <ButtonLink href="/gra">Wróć do gry</ButtonLink>
      <Button
        variant="secondary"
        onClick={() => {
          setGame(null);
          router.push("/gra");
        }}
      >
        Zacznij nową grę
      </Button>
    </>
  );
}
