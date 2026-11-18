"use client";

import { HomeActions } from "@/components/game/HomeActions";
import { Ranking } from "@/components/game/Ranking";
import { useLeague } from "./LeagueProvider";
import { LiveBanners } from "@/components/live/LiveBanners";
import { MyGames } from "./MyGames";
import { LoadError, Loading } from "./StatusScreens";
import { InstallHint } from "@/components/InstallHint";
import { HomeHeader } from "./HomeHeader";
import { Welcome } from "./Welcome";

export function HomeScreen() {
  const { state } = useLeague();
  if (state.status !== "ready") {
    return (
      <>
        <HomeHeader />
        {state.status === "loading" ? <Loading /> : <LoadError {...state} />}
      </>
    );
  }
  const { me, ranking, myGames } = state.data;
  if (!me) {
    return (
      <>
        <HomeHeader />
        <Welcome />
      </>
    );
  }

  return (
    <>
      <HomeHeader me={me} />

      <LiveBanners myId={me.member.id} />

      <div className="flex flex-col gap-3">
        <HomeActions />
      </div>

      <Ranking rows={ranking.rows} games={ranking.games} myId={me.member.id} />
      <MyGames games={myGames} />
      <InstallHint />
    </>
  );
}
