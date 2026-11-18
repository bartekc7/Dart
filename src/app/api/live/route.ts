import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { liveGames, requireMe } from "@/lib/server/league";

/** Trwające (i świeżo zakończone) gry ligi. Telefony graczy pytają co kilka sekund. */
export async function GET(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    return NextResponse.json({ games: await liveGames(db, me.league.id) });
  });
}
