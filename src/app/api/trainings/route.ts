import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson, track } from "@/lib/server/http";
import { requireMe } from "@/lib/server/league";
import { myTrainings, saveTraining } from "@/lib/server/training";

/** Moje treningi solo (tylko własne). */
export async function GET(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    return NextResponse.json({ trainings: await myTrainings(db, me) });
  }, req);
}

/** Zapis zakończonego treningu (wynik przelicza serwer). */
export async function POST(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const { created } = await saveTraining(db, me, await readJson(req));
    if (created) track(db, { type: "training_end", memberId: me.member.id, token: deviceToken(req) });
    return NextResponse.json({ ok: true });
  }, req);
}
