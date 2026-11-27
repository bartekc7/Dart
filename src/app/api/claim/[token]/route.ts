import { NextResponse, type NextRequest } from "next/server";
import { ensureDeviceToken, handle, track, withDeviceCookie } from "@/lib/server/http";
import { claimDevice, claimPreview, UserError } from "@/lib/server/league";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/claim/[token]">) {
  const { token } = await ctx.params;
  return handle(async (db) => {
    const preview = await claimPreview(db, token);
    if (!preview)
      throw new UserError("Ten link wygasł albo został już użyty. Poproś organizatora o nowy.", 410);
    return NextResponse.json(preview);
  });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/claim/[token]">) {
  const { token: claim } = await ctx.params;
  return handle(async (db) => {
    const { token } = ensureDeviceToken(req);
    await claimDevice(db, token, claim);
    track(db, { type: "device_claim", token });
    return withDeviceCookie(NextResponse.json({ ok: true }), token);
  });
}
