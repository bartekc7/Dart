"use client";

import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useStoredGame } from "@/lib/game/storage";

export function HomeActions() {
  const [game, setGame] = useStoredGame();
  const router = useRouter();
  const inProgress = game && !game.winnerId;

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
