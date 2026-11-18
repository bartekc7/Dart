import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { makeOrganizer, requireMe } from "@/lib/server/league";

/** Organizator przekazuje swoją rolę innemu graczowi. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/members/[id]/organizer">) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    await makeOrganizer(db, me, id);
    return NextResponse.json({ ok: true });
  });
}
