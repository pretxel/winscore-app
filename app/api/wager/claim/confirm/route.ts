import { base58 } from "@scure/base";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { bytesToBytea, requireBytea } from "@/lib/wager/bytea";
import { verifyClaimOnChain } from "@/lib/wager/claim-verification";

export const dynamic = "force-dynamic";

/**
 * Records a claim as claimed after proving it on chain.
 *
 * Idempotent and safe to lose: the Claim PDA is the source of truth, so a client
 * that never calls this (or calls it twice) cannot double-pay or strand an award —
 * the row just catches up whenever this runs.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { claimId?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.claimId) {
    return NextResponse.json({ error: "claimId is required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: claim } = await admin
    .from("wager_claims")
    .select("id, state, award_base_units, claim_pda")
    .eq("id", body.claimId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }
  if (claim.state === "claimed") {
    return NextResponse.json({ ok: true, state: "claimed", alreadyRecorded: true });
  }

  const verification = await verifyClaimOnChain(
    base58.encode(requireBytea(claim.claim_pda, 32, "claim_pda")),
    Number(claim.award_base_units),
  );

  if (!verification.claimed) {
    return NextResponse.json(
      { error: verification.error ?? "Claim is not confirmed on-chain", state: claim.state },
      { status: 422 },
    );
  }

  const { error } = await admin
    .from("wager_claims")
    .update({
      state: "claimed",
      claimed_at: new Date().toISOString(),
      // Signatures arrive base58-encoded, matching wager_entries.transaction_signature.
      ...(body.signature ? { claim_signature: bytesToBytea(base58.decode(body.signature)) } : {}),
    })
    .eq("id", claim.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, state: "claimed", amountBaseUnits: verification.amountBaseUnits },
    { headers: { "Cache-Control": "no-store" } },
  );
}
