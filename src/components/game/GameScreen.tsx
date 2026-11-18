"use client";

import { useStoredGame } from "@/lib/game/storage";
import { SetupView } from "./SetupView";
import { PlayView } from "./PlayView";
import { WinnerView } from "./WinnerView";

export function GameScreen() {
  const [game, setGame] = useStoredGame();

  if (game === undefined) return <div className="flex-1" />; // wczytywanie
  if (!game) return <SetupView onStart={setGame} />;
  if (game.winnerId) return <WinnerView game={game} onChange={setGame} />;
  return <PlayView game={game} onChange={setGame} />;
}
