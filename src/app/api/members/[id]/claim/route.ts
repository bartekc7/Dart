import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { createClaimToken, requireMe } from "@/lib/server/league";

/** Organizator: jednorazowy link przypisujący gracza do nowego telefonu. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/members/[id]/claim">) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    return NextResponse.json({ token: await createClaimToken(db, me, id) });
  });
}
