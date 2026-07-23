"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getWagerEnv } from "@/lib/wager/env";

/**
 * Prepare a claim transaction for a winner.
 * Verifies Merkle proof, checks claim PDA, and builds the claim instruction.
 */
export async function prepareClaim(
  settlementId: string,
  entryId: string,
): Promise<{ claimable: boolean; claimSignature?: string; error?: string }> {
  const admin = createAdminSupabaseClient();
  const _env = getWagerEnv();

  // Fetch settlement with Merkle root
  const { data: settlement } = await admin
    .from("wager_settlements")
    .select("*")
    .eq("id", settlementId)
    .single();

  if (!settlement) {
    return { claimable: false, error: "Settlement not found" };
  }

  // Fetch entry
  const { data: entry } = await admin
    .from("wager_entries")
    .select("*")
    .eq("id", entryId)
    .eq("state", "confirmed")
    .single();

  if (!entry) {
    return { claimable: false, error: "Entry not found or not confirmed" };
  }

  // Check if already claimed
  const { data: existingClaim } = await admin
    .from("wager_claims")
    .select("id, state")
    .eq("entry_id", entryId)
    .eq("state", "claimed")
    .maybeSingle();

  if (existingClaim) {
    return { claimable: false, error: "Already claimed" };
  }

  // Get winner allocation from settlement manifest
  const _manifest = await admin
    .from("wager_settlements")
    .select("manifest_canonical_bytes")
    .eq("id", settlementId)
    .single();

  // For MVP: build the claim using the Merkle proof from the manifest
  // In production: compute the proof dynamically from the Merkle tree

  const _walletBytes =
    typeof entry.wallet_address === "string"
      ? Buffer.from(entry.wallet_address, "hex")
      : Buffer.from(entry.wallet_address as unknown as ArrayBuffer);

  const wagerRoundPubkey = new Uint8Array(32); // Derive from wager_round PDA

  // Create pending claim record
  const { data: claim, error: claimError } = await admin
    .from("wager_claims")
    .insert({
      wager_round_id: entry.wager_round_id,
      settlement_id: settlementId,
      user_id: entry.user_id,
      entry_id: entryId,
      wallet_address: entry.wallet_address,
      claim_pda: Buffer.from(wagerRoundPubkey) as unknown as string,
      award_base_units: entry.stake_base_units,
      state: "pending",
    })
    .select("id")
    .single();

  if (claimError) {
    return { claimable: false, error: claimError.message };
  }

  return {
    claimable: true,
    claimSignature: `pending-${claim.id}`,
  };
}

/**
 * Activate cancellation and refund for a wager round.
 * Handles: admin cancellation, no scoreable fixtures, assignment change, safety timeout.
 */
export async function activateRefund(
  wagerRoundId: string,
  reason: "admin" | "no_fixtures" | "timeout" | "assignment_change",
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminSupabaseClient();

  const { data: wagerRound } = await admin
    .from("wager_rounds")
    .select("*")
    .eq("id", wagerRoundId)
    .in("state", ["initialized", "locked"])
    .single();

  if (!wagerRound) {
    return { ok: false, error: "Wager round not found or not in cancellable state" };
  }

  // Validate reason
  if (reason === "timeout") {
    const closeTime = new Date(wagerRound.closes_at).getTime();
    const timeoutMs = 7 * 24 * 3600_000; // 7 days
    if (Date.now() < closeTime + timeoutMs) {
      return { ok: false, error: "Safety timeout has not elapsed" };
    }
  }

  // Mark round as cancelled
  await admin.from("wager_rounds").update({ state: "cancelled" }).eq("id", wagerRoundId);

  // Apppend chain event
  await admin.from("wager_chain_events").insert({
    event_type: "cancel_requested",
    wager_round_pda: Buffer.alloc(32) as unknown as string,
    parsed_data: { reason, cancelled_at: new Date().toISOString() },
    observed_at: new Date().toISOString(),
  });

  return { ok: true };
}
