import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { leagueStats, requireMe } from "@/lib/server/league";

/** Statystyki całej ligi – widoczne dla każdego gracza ligi. */
export async function GET(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    return NextResponse.json(await leagueStats(db, me.league.id));
  });
}
