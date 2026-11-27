import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson } from "@/lib/server/http";
import {
  acceptDuel,
  cancelDuel,
  declineDuel,
  rematchDuel,
  setDuelLive,
  submitDuelTurn,
  undoDuelTurn,
} from "@/lib/server/duels";
import { UserError } from "@/lib/server/league";

/** Akcje w grze 1 na 1: przyjęcie, odmowa, anulowanie, seria, cofnięcie, rzutki na żywo, rewanż. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/duels/[id]/[action]">) {
  const { id, action } = await ctx.params;
  return handle(async (db) => {
    const token = deviceToken(req);
    const body = await readJson(req);
    switch (action) {
      case "accept":
        return NextResponse.json({ duel: await acceptDuel(db, token, id) });
      case "decline":
        await declineDuel(db, token, id);
        return NextResponse.json({ ok: true });
      case "cancel":
        await cancelDuel(db, token, id);
        return NextResponse.json({ ok: true });
      case "turn":
        return NextResponse.json({ duel: await submitDuelTurn(db, token, id, body) });
      case "undo":
        return NextResponse.json(await undoDuelTurn(db, token, id));
      case "live":
        await setDuelLive(db, token, id, body);
        return NextResponse.json({ ok: true });
      case "rematch":
        return NextResponse.json(await rematchDuel(db, token, id));
      default:
        throw new UserError("Nieznana akcja.", 404);
    }
  });
}
