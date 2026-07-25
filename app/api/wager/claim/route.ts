import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prepareClaim } from "@/lib/wager/claim-refund";
import { getWagerEnv } from "@/lib/wager/env";

export const dynamic = "force-dynamic";

/**
 * Returns an unsigned claim transaction for the authenticated winner to sign.
 * The award and proof are derived server-side from the settled manifest; the
 * client cannot influence either.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getWagerEnv().settlementEnabled) {
    return NextResponse.json({ error: "Settlement is currently disabled" }, { status: 403 });
  }

  let body: { settlementId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.settlementId) {
    return NextResponse.json({ error: "settlementId is required" }, { status: 400 });
  }

  try {
    // The user id comes from the session, never the request body.
    const result = await prepareClaim(body.settlementId, user.id);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to prepare claim";
    const notClaimable =
      message === "Already claimed" ||
      message === "No award to claim for this round" ||
      message === "Round is not settled yet";
    return NextResponse.json({ error: message }, { status: notClaimable ? 409 : 500 });
  }
}
