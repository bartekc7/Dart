import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson } from "@/lib/server/http";
import { deleteLiveGame, liveGame, publishLiveGame, requireMe } from "@/lib/server/league";

type Ctx = RouteContext<"/api/live/[id]">;

/** Podgląd jednej gry na żywo. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const game = await liveGame(db, me.league.id, id);
    if (!game) return NextResponse.json({ error: "Ta gra już się nie toczy." }, { status: 404 });
    return NextResponse.json({ game });
  });
}

/** Telefon liczący punkty wysyła bieżący stan gry. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const body = await readJson(req);
    return NextResponse.json(await publishLiveGame(db, me, { ...body, id }));
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    await deleteLiveGame(db, me, id);
    return NextResponse.json({ ok: true });
  });
}
