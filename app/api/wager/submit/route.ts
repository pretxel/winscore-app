import { createSolanaRpc } from "@solana/kit";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { transitionIntentState } from "@/lib/wager/entry-saga";
import { getWagerEnv } from "@/lib/wager/env";
import { persistVerifiedEntry } from "@/lib/wager/verify-entry";

export const dynamic = "force-dynamic";

const POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getWagerEnv();
  if (!env.depositsEnabled) {
    return NextResponse.json({ error: "Deposits are currently disabled" }, { status: 403 });
  }

  let body: { intentId?: string; signature?: string; entryPda?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { intentId, signature, entryPda } = body;
  if (!intentId || !signature || !entryPda) {
    return NextResponse.json(
      { error: "intentId, signature and entryPda are required" },
      { status: 400 },
    );
  }

  // Intent must belong to the caller and be awaiting its signature.
  const { data: intent } = await supabase
    .from("wager_intents")
    .select("id, wager_round_id")
    .eq("id", intentId)
    .eq("user_id", user.id)
    .eq("state", "awaiting_signature")
    .single();

  if (!intent) {
    return NextResponse.json(
      { error: "Intent not found or not awaiting signature" },
      { status: 404 },
    );
  }

  await transitionIntentState(intentId, "submitted");

  const admin = createAdminSupabaseClient();
  const { data: round } = await admin
    .from("wager_rounds")
    .select("stake_base_units")
    .eq("id", intent.wager_round_id ?? "")
    .single();

  const rpc = createSolanaRpc(env.rpcUrl);

  // Poll the signature status until it confirms (or fails).
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const { value } = await rpc
      .getSignatureStatuses([signature as never], { searchTransactionHistory: true })
      .send();
    const status = value[0];

    if (status) {
      if (status.err) {
        await transitionIntentState(intentId, "failed");
        return NextResponse.json(
          { error: "Transaction failed on-chain", state: "failed" },
          { status: 422 },
        );
      }

      const confirmed =
        status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized";
      if (confirmed) {
        await persistVerifiedEntry(intentId, signature, {
          entryPda,
          stakeBaseUnits: String(round?.stake_base_units ?? 0),
          walletAddress: "",
          wagerRoundKey: "",
          intentHash: "",
          pickCommitment: "",
          blockSlot: Number(status.slot ?? 0),
        });
        return NextResponse.json(
          { ok: true, state: "confirmed", signature },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    if (attempt < POLL_ATTEMPTS - 1) await sleep(POLL_INTERVAL_MS);
  }

  // Not confirmed within the window — hand off to the reconciler.
  await transitionIntentState(intentId, "reconciliation_required");
  return NextResponse.json(
    { ok: true, state: "reconciliation_required", signature },
    { status: 202 },
  );
}
