import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, ensureDeviceToken, handle, readJson, track, withDeviceCookie } from "@/lib/server/http";
import { acceptByCode, invitePreview } from "@/lib/server/duels";

/** Zaproszenie z linku: kto zaprasza i czy ten telefon musi najpierw podać nazwę. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/duels/code/[code]">) {
  const { code } = await ctx.params;
  return handle(async (db) => NextResponse.json(await invitePreview(db, deviceToken(req), code)), req);
}

/** Nowa osoba przyjmuje zaproszenie z linku (z nazwą i znakiem, jeśli to jej pierwszy raz). */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/duels/code/[code]">) {
  const { code } = await ctx.params;
  return handle(async (db) => {
    const body = await readJson(req);
    const { token } = ensureDeviceToken(req);
    const out = await acceptByCode(db, token, code, body);
    track(db, { type: "duel_start", token });
    return withDeviceCookie(NextResponse.json(out), token);
  }, req);
}
