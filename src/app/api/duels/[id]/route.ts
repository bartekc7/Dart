import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { getDuel, requireProfile } from "@/lib/server/duels";

/** Stan gry 1 na 1 – tylko dla jej dwóch graczy. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/duels/[id]">) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireProfile(db, deviceToken(req));
    return NextResponse.json({ duel: await getDuel(db, me, id), me: me.id });
  });
}
