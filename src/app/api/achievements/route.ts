import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { leagueAchievements, requireMe } from "@/lib/server/league";

/** Osiągnięcia i rekordy wszystkich graczy ligi; `?exclude=<id gry>` pomija trwającą grę. */
export async function GET(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const exclude = req.nextUrl.searchParams.get("exclude")?.slice(0, 64) || undefined;
    return NextResponse.json(await leagueAchievements(db, me.league.id, exclude));
  });
}
