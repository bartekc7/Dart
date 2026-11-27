import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { opponents } from "@/lib/server/duels";

/** Kogo mogę zaprosić: gracze mojej ligi i dotychczasowi rywale (z bilansem). */
export async function GET(req: NextRequest) {
  return handle(async (db) => NextResponse.json({ opponents: await opponents(db, deviceToken(req)) }));
}
