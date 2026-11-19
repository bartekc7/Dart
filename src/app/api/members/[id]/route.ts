import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { removeMember, requireMe } from "@/lib/server/league";

/** Organizator usuwa gracza z ligi. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    await removeMember(db, me, id);
    return NextResponse.json({ ok: true });
  });
}
