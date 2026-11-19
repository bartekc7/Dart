import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { deleteGame, requireMe } from "@/lib/server/league";

/** Usunięcie gry z rankingu: po cofnięciu ostatniej serii albo przez organizatora z historii. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/games/[id]">) {
  const { id } = await ctx.params;
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    await deleteGame(db, me, id);
    return NextResponse.json({ ok: true });
  });
}
