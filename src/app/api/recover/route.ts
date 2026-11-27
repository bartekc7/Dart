import { NextResponse, type NextRequest } from "next/server";
import { ensureDeviceToken, handle, readJson, track, withDeviceCookie } from "@/lib/server/http";
import { recoverWithCode } from "@/lib/server/league";

/** Nowy telefon organizatora: kod odzyskiwania przywraca mu ligę i rolę organizatora. */
export async function POST(req: NextRequest) {
  return handle(async (db) => {
    const { token } = ensureDeviceToken(req);
    const body = await readJson(req);
    await recoverWithCode(db, token, body.code);
    track(db, { type: "recover", token });
    return withDeviceCookie(NextResponse.json({ ok: true }), token);
  });
}
