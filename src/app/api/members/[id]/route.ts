import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson, track } from "@/lib/server/http";
import { removeMember, renameMember, requireMe, setMemberLook, UserError } from "@/lib/server/league";

/** Organizator usuwa gracza z ligi. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    await removeMember(db, me, id);
    return NextResponse.json({ ok: true });
  });
}

/** Zmiana nazwy i/lub znaku: swojej (każdy) albo innego gracza (organizator). */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/members/[id]">) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const body = await readJson(req);
    let member = undefined;
    if (body.look !== undefined) member = await setMemberLook(db, me, id, body.look);
    if (body.name !== undefined) {
      const before = member?.name;
      member = await renameMember(db, me, id, body.name);
      if (member.name !== before) track(db, { type: "rename", memberId: me.member.id, token: deviceToken(req) });
    }
    if (!member) throw new UserError("Nic do zmiany.");
    return NextResponse.json({ member });
  });
}
