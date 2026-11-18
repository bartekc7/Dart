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

      {/* Telefon: jedna kolumna (baner, nowa gra, ranking, ostatnie gry).
          Tablet i komputer: ranking w prawej kolumnie obok „Nowa gra”. */}
      <div className="wide flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start md:gap-8">
        <div className="contents md:flex md:flex-col md:gap-6">
          <LiveBanners myId={me.member.id} />
          <div className="flex flex-col gap-3">
            <HomeActions />
          </div>
          <div className="order-1 empty:hidden md:order-none">
            <MyGames games={myGames} />
          </div>
          <div className="order-1 empty:hidden md:order-none">
            <InstallHint />
          </div>
        </div>
        <div className="md:sticky md:top-4">
          <Ranking rows={ranking.rows} games={ranking.games} myId={me.member.id} />
        </div>
      </div>
    </>
  );
}
