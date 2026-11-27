import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson, track } from "@/lib/server/http";
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
      case "accept": {
        const duel = await acceptDuel(db, token, id);
        track(db, { type: "duel_start", token });
        return NextResponse.json({ duel });
      }
      case "decline":
        await declineDuel(db, token, id);
        track(db, { type: "duel_decline", token });
        return NextResponse.json({ ok: true });
      case "cancel":
        await cancelDuel(db, token, id);
        track(db, { type: "duel_cancel", token });
        return NextResponse.json({ ok: true });
      case "turn": {
        const duel = await submitDuelTurn(db, token, id, body);
        if (duel.status === "finished") track(db, { type: "duel_end", token });
        return NextResponse.json({ duel });
      }
      case "undo":
        return NextResponse.json(await undoDuelTurn(db, token, id));
      case "live":
        await setDuelLive(db, token, id, body);
        return NextResponse.json({ ok: true });
      case "rematch": {
        const out = await rematchDuel(db, token, id);
        track(db, { type: "duel_invite", token });
        return NextResponse.json(out);
      }
      default:
        throw new UserError("Nieznana akcja.", 404);
    }
  }, req);
}
