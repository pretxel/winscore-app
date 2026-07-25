import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prepareRefund } from "@/lib/wager/claim-refund";

export const dynamic = "force-dynamic";

/**
 * Returns an unsigned refund transaction for the authenticated entrant of a
 * cancelled round.
 *
 * Deliberately not gated on the deposit or settlement flags: pulling a stake back
 * out of a cancelled round must keep working even after wagering is switched off.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { wagerRoundId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.wagerRoundId) {
    return NextResponse.json({ error: "wagerRoundId is required" }, { status: 400 });
  }

  try {
    const result = await prepareRefund(body.wagerRoundId, user.id);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to prepare refund";
    const notRefundable =
      message === "Already refunded" ||
      message === "No entry to refund for this round" ||
      message.includes("refunds require a cancelled round");
    return NextResponse.json({ error: message }, { status: notRefundable ? 409 : 500 });
  }
}
