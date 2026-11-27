import { NextResponse, type NextRequest } from "next/server";
import { ensureDeviceToken, handle, readJson, track, withDeviceCookie } from "@/lib/server/http";
import { createLeague } from "@/lib/server/league";

export async function POST(req: NextRequest) {
  return handle(async (db) => {
    const body = await readJson(req);
    const { token } = ensureDeviceToken(req);
    await createLeague(db, token, body.leagueName, body.playerName, body.look);
    track(db, { type: "league_create", token });
    return withDeviceCookie(NextResponse.json({ ok: true }), token);
  }, req);
}
