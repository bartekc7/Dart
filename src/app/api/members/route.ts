import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle, readJson } from "@/lib/server/http";
import { addMember, requireMe } from "@/lib/server/league";

/** Dodanie gracza bez telefonu. */
export async function POST(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const body = await readJson(req);
    return NextResponse.json({ member: await addMember(db, me, body.name) });
  });
}
