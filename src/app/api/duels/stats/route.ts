import { NextResponse, type NextRequest } from "next/server";
import { deviceToken, handle } from "@/lib/server/http";
import { duelSummary } from "@/lib/server/duels";

/** Mój bilans 1 na 1 ze wszystkimi i moje rekordy 1 na 1 (`?bez=<id>` – bez tej gry). */
export async function GET(req: NextRequest) {
  const except = req.nextUrl.searchParams.get("bez") ?? undefined;
  return handle(async (db) => NextResponse.json(await duelSummary(db, deviceToken(req), except)));
}
