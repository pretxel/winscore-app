import { createSolanaRpc } from "@solana/kit";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { transitionIntentState } from "@/lib/wager/entry-saga";
import { getWagerEnv } from "@/lib/wager/env";
import { persistVerifiedEntry, verifyEntryTransaction } from "@/lib/wager/verify-entry";

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

  // `entryPda` from the client is intentionally ignored: it is re-derived and
  // proven against the on-chain transaction inside verifyEntryTransaction.
  let body: { intentId?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { intentId, signature } = body;
  if (!intentId || !signature) {
    return NextResponse.json({ error: "intentId and signature are required" }, { status: 400 });
  }

  // Intent must belong to the caller and be awaiting its signature.
  const { data: intent } = await supabase
    .from("wager_intents")
    .select("id")
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
        // Prove the confirmed transaction actually performed this deposit before
        // recording the entry. A confirmed signature is necessary but not
        // sufficient — the transaction must match the intent exactly.
        const verification = await verifyEntryTransaction(signature, intentId);
        if (!verification.verified || !verification.entry) {
          await transitionIntentState(intentId, "failed");
          return NextResponse.json(
            { error: verification.error ?? "On-chain verification failed", state: "failed" },
            { status: 422 },
          );
        }

        await persistVerifiedEntry(intentId, signature, verification.entry);
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
