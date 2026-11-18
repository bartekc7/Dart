import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson } from "@/lib/server/http";
import { requireMe, setEntryMode } from "@/lib/server/league";

/** Ustawienia ligi (tylko organizator): sposób wpisywania punktów. */
export async function POST(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const body = await readJson(req);
    await setEntryMode(db, me, body.entryMode);
    return NextResponse.json({ ok: true });
  });
}
