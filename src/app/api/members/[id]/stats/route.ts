import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { memberStats, requireMe } from "@/lib/server/league";

/** Karta gracza – widoczna dla każdego w tej samej lidze. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/members/[id]/stats">) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    return NextResponse.json(await memberStats(db, me.league.id, id));
  });
}
