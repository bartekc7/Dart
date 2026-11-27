import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson, track } from "@/lib/server/http";
import { isClientEvent } from "@/lib/events";

/** Zdarzenia zgłaszane przez telefon (wejście do aplikacji, start treningu). Zawsze odpowiada „ok”. */
export async function POST(req: NextRequest) {
  return handle(async (db) => {
    const body = await readJson(req);
    const token = deviceToken(req);
    if (token && isClientEvent(body.type)) track(db, { type: body.type, token });
    return NextResponse.json({ ok: true });
  });
}
