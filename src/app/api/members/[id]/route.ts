import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson } from "@/lib/server/http";
import { removeMember, renameMember, requireMe } from "@/lib/server/league";

/** Organizator usuwa gracza z ligi. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    await removeMember(db, me, id);
    return NextResponse.json({ ok: true });
  });
}

/** Zmiana nazwy: swojej (każdy) albo innego gracza (organizator). */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const body = await readJson(req);
    return NextResponse.json({ member: await renameMember(db, me, id, body.name) });
  });
}
