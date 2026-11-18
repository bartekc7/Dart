"use client";

import { useLeague } from "@/components/league/LeagueProvider";
import { LoadError, Loading } from "@/components/league/StatusScreens";
import { ButtonLink } from "@/components/ui/Button";
import { isGameOver } from "@/lib/game/engine";
import { useStoredGame } from "@/lib/game/storage";
import { PlayView } from "./PlayView";
import { ResultsView } from "./ResultsView";
import { SetupView } from "./SetupView";

export function GameScreen() {
  const [game, setGame] = useStoredGame();
  const { state } = useLeague();

  // Trwająca gra działa też bez sieci – liga potrzebna dopiero przy zapisie wyniku.
  if (game && !isGameOver(game)) return <PlayView game={game} onChange={setGame} />;
  if (game === undefined || state.status === "loading") return <Loading />;
  if (state.status === "error") return <LoadError {...state} />;
  if (!state.data.me) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted">Najpierw załóż ligę albo dołącz do niej.</p>
        <ButtonLink href="/" className="max-w-xs">
          Wróć na start
        </ButtonLink>
      </div>
    );
  }
  if (!game) return <SetupView members={state.data.members} myId={state.data.me.member.id} onStart={setGame} />;
  return <ResultsView game={game} onChange={setGame} />;
}
