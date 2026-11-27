"use client";

import Link from "next/link";
import { HomeActions } from "@/components/game/HomeActions";
import { Ranking } from "@/components/game/Ranking";
import { useLeague } from "./LeagueProvider";
import { LiveBanners } from "@/components/live/LiveBanners";
import { MyGames } from "./MyGames";
import { LoadError, Loading } from "./StatusScreens";
import { InstallHint } from "@/components/InstallHint";
import { HomeHeader } from "./HomeHeader";
import { Welcome } from "./Welcome";
import { WhatsNewPopup } from "@/components/WhatsNew";
import { DuelBanner } from "@/components/duel/DuelHome";

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
        <WhatsNewPopup />
        <DuelBanner />
        <Welcome />
      </>
    );
  }

  return (
    <>
      <HomeHeader me={me} />
      <WhatsNewPopup />

      {/* Telefon: jedna kolumna (baner, nowa gra, ranking, ostatnie gry).
          Tablet i komputer: ranking w prawej kolumnie obok „Nowa gra”. */}
      <div className="wide flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start md:gap-8">
        <div className="contents md:flex md:flex-col md:gap-6">
          <LiveBanners myId={me.member.id} />
          <div className="flex flex-col gap-3">
            <DuelBanner />
            <HomeActions />
            {me.member.isOrganizer && !me.league.hasRecoveryCode && (
              <Link
                href="/liga#odzyskiwanie"
                className="rounded-2xl bg-cream/10 px-4 py-3 text-sm ring-1 ring-cream/40"
              >
                🔑 <strong>Zabezpiecz ligę:</strong> utwórz kod odzyskiwania na wypadek zgubienia telefonu ›
              </Link>
            )}
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
