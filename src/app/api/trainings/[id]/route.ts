import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { requireMe } from "@/lib/server/league";
import { deleteTraining } from "@/lib/server/training";

/** Usunięcie własnego treningu. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/trainings/[id]">) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const { id } = await ctx.params;
    await deleteTraining(db, me, decodeURIComponent(id));
    return NextResponse.json({ ok: true });
  }, req);
}
