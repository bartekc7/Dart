import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { duelsMe } from "@/lib/server/duels";

/** Zaproszenie do mnie, moja trwająca gra 1 na 1 i moje zaproszenie. Telefon pyta co kilka sekund. */
export async function GET(req: NextRequest) {
  return handle(async (db) => NextResponse.json(await duelsMe(db, deviceToken(req))));
}
