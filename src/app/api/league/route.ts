import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { leagueRanking, listMembers, recentGamesOf, whoAmI } from "@/lib/server/league";

/** Stan ligi dla tego urządzenia: liga, kim jestem, gracze, ranking i moje ostatnie gry. */
export async function GET(req: NextRequest) {
  return handle(async (db) => {
    const me = await whoAmI(db, deviceToken(req));
    if (!me) return NextResponse.json({ me: null });
    const [members, ranking, myGames] = await Promise.all([
      listMembers(db, me.league.id),
      leagueRanking(db, me.league.id),
      recentGamesOf(db, me.member.id),
    ]);
    return NextResponse.json({ me, members, ranking, myGames });
  });
}
