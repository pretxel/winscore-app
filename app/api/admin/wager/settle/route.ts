import { NextResponse } from "next/server";
import { assertAdmin } from "@/app/api/admin/wager/_admin";
import { checkSettlementReadiness, settleWagerRound } from "@/lib/wager/settlement";

export const dynamic = "force-dynamic";

/**
 * GET reports whether a round can be settled and why not, so the console can
 * show the blocker without attempting an irreversible on-chain write.
 */
export async function GET(request: Request) {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;

  const wagerRoundId = new URL(request.url).searchParams.get("wagerRoundId");
  if (!wagerRoundId) {
    return NextResponse.json({ error: "wagerRoundId is required" }, { status: 400 });
  }

  const readiness = await checkSettlementReadiness(wagerRoundId);
  return NextResponse.json(readiness, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await assertAdmin();
  if (!auth.ok) return auth.response;

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
    const result = await settleWagerRound(body.wagerRoundId);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Settlement failed";
    // A round that is simply not ready yet is a client-side condition; anything
    // else means the chain or the database rejected the attempt.
    const status = message.startsWith("Round is not ready") ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
