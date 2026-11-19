import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson } from "@/lib/server/http";
import { clearLeague, requireMe } from "@/lib/server/league";

/** Organizator czyści ligę: same gry albo gry i graczy (poza sobą). */
export async function POST(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const body = await readJson(req);
    await clearLeague(db, me, body.mode, body.leagueName);
    return NextResponse.json({ ok: true });
  });
}
