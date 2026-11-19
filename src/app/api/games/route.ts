import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson } from "@/lib/server/http";
import { leagueGames, requireMe, saveGame } from "@/lib/server/league";

/** Zapis zakończonej gry (miejsca przelicza serwer). */
export async function POST(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    await saveGame(db, me, await readJson(req));
    return NextResponse.json({ ok: true });
  });
}

/** Historia gier ligi. */
export async function GET(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    return NextResponse.json({ games: await leagueGames(db, me.league.id) });
  });
}
