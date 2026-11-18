import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, ensureDeviceToken, handle, readJson, withDeviceCookie } from "@/lib/server/http";
import { joinLeague, leagueByCode, UserError, whoAmI } from "@/lib/server/league";

/** Podgląd zaproszenia: nazwa ligi i czy ten telefon już do niej należy. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/join/[code]">) {
  const { code } = await ctx.params;
  return handle(async (db) => {
    const league = await leagueByCode(db, code);
    if (!league) throw new UserError("Nie ma ligi z takim kodem. Sprawdź link.", 404);
    const me = await whoAmI(db, deviceToken(req));
    return NextResponse.json({
      leagueName: league.name,
      memberName: me?.league.id === league.id ? me.member.name : null,
      otherLeague: me && me.league.id !== league.id ? me.league.name : null,
    });
  });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/join/[code]">) {
  const { code } = await ctx.params;
  return handle(async (db) => {
    const body = await readJson(req);
    const { token } = ensureDeviceToken(req);
    await joinLeague(db, token, code, body.name);
    return withDeviceCookie(NextResponse.json({ ok: true }), token);
  });
}
