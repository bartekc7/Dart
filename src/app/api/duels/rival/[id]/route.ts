import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { rivalSummary } from "@/lib/server/duels";

/** Ty vs rywal: bilans, porównanie i ostatnie wspólne gry (tylko dla mnie). */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/duels/rival/[id]">) {
  const { id } = await ctx.params;
  return handle(async (db) => NextResponse.json(await rivalSummary(db, deviceToken(req), id)));
}
