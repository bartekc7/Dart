import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { createRecoveryCode, requireMe } from "@/lib/server/league";

/** Organizator tworzy nowy kod odzyskiwania (poprzedni przestaje działać). */
export async function POST(req: NextRequest) {
  return handle(async (db) => {
    const me = await requireMe(db, deviceToken(req));
    const code = await createRecoveryCode(db, me);
    return NextResponse.json({ code });
  }, req);
}
