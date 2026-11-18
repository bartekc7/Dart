"use client";

import Link from "next/link";
import { HomeActions } from "@/components/game/HomeActions";
import { Ranking } from "@/components/game/Ranking";
import { useLeague } from "./LeagueProvider";
import { LiveBanners } from "@/components/live/LiveBanners";
import { MyGames } from "./MyGames";
import { LoadError, Loading } from "./StatusScreens";
import { Welcome } from "./Welcome";

export function HomeScreen() {
  const { state } = useLeague();
  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <LoadError {...state} />;
  const { me, ranking, myGames } = state.data;
  if (!me) return <Welcome />;

  return (
    <>
      <Link
        href="/liga"
        className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line active:bg-surface-2"
      >
        <span className="text-2xl" aria-hidden>
          🏟️
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{me.league.name}</span>
          <span className="block truncate text-sm text-muted">
            Grasz jako {me.member.name}
            {me.member.isOrganizer && " · organizator"}
          </span>
        </span>
        <span className="text-sm font-semibold text-muted">Zaproś ›</span>
      </Link>

      <LiveBanners myId={me.member.id} />

      <div className="flex flex-1 flex-col gap-6">
        <Ranking rows={ranking.rows} games={ranking.games} myId={me.member.id} />
        <MyGames games={myGames} />
      </div>

      <nav className="sticky bottom-0 flex flex-col gap-3 bg-board pt-2">
        <HomeActions />
      </nav>
    </>
  );
}
