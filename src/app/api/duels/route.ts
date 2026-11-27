import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson, track } from "@/lib/server/http";
import { createDuel } from "@/lib/server/duels";

/** Nowe zaproszenie do gry 1 na 1 (do znanego rywala albo link dla nowej osoby). */
export async function POST(req: NextRequest) {
  return handle(async (db) => {
    const body = await readJson(req);
    const out = await createDuel(db, deviceToken(req), body);
    track(db, { type: "duel_invite", token: deviceToken(req) });
    return NextResponse.json(out);
  });
}
