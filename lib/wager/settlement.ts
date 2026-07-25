/**
 * Settlement readiness and execution.
 *
 * The chain enforces the invariants that matter (only the settlement authority
 * may settle, only from Locked, exactly once, and total_distributable must equal
 * the vault balance). These checks exist so an operator sees why a round is not
 * settleable yet instead of a failed simulation, and so results have had time to
 * be corrected before they are committed irreversibly.
 */

import { address } from "@solana/kit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { loadWagerAuthoritySigner } from "@/lib/wager/authority";
import { bytesToBytea, requireBytea } from "@/lib/wager/bytea";
import { getWagerEnv } from "@/lib/wager/env";
import { buildLockInstruction, buildSettleInstruction } from "@/lib/wager/instructions";
import { buildSettlementManifest } from "@/lib/wager/manifest";
import { canonicalManifestBytes, hashManifest } from "@/lib/wager/manifest-hash";
import {
  addressFromBytes,
  deriveClaimPda,
  deriveVaultAta,
  deriveWagerRoundPda,
} from "@/lib/wager/pda";
import { sendAndConfirmInstructions } from "@/lib/wager/send-transaction";

const CORRECTION_DELAY_MS = 3600_000; // 1 hour for Devnet

/** States a round may be in and still be worth settling. */
const SETTLEABLE_STATES = new Set(["initialized", "locked"]);

export async function checkSettlementReadiness(
  wagerRoundId: string,
): Promise<{ ready: boolean; reason?: string }> {
  const admin = createAdminSupabaseClient();
  const env = getWagerEnv();

  if (!env.settlementEnabled) {
    return { ready: false, reason: "Settlement is disabled" };
  }

  const { data: wagerRound } = await admin
    .from("wager_rounds")
    .select("*")
    .eq("id", wagerRoundId)
    .single();

  if (!wagerRound) {
    return { ready: false, reason: "Wager round not found" };
  }

  // A round still open for entry gets locked as part of settling, so both
  // 'initialized' and 'locked' are acceptable starting points; 'settled',
  // 'cancelled', and 'closed' are terminal.
  if (!SETTLEABLE_STATES.has(wagerRound.state)) {
    return { ready: false, reason: `Wager round state is ${wagerRound.state}, not settleable` };
  }

  if (new Date(wagerRound.closes_at).getTime() > Date.now()) {
    return { ready: false, reason: "Round has not closed yet" };
  }

  const { data: fixtures } = await admin
    .from("matches")
    .select("status, home_score, away_score, updated_at")
    .eq("round_id", wagerRound.round_id);

  if (!fixtures?.length) {
    return { ready: false, reason: "Round has no fixtures" };
  }

  const nonTerminal = fixtures.filter((f) => f.status !== "final" && f.status !== "cancelled");
  if (nonTerminal.length > 0) {
    return {
      ready: false,
      reason: `${nonTerminal.length} fixtures are not final or cancelled`,
    };
  }

  const finalWithoutScores = fixtures.filter(
    (f) => f.status === "final" && (f.home_score == null || f.away_score == null),
  );
  if (finalWithoutScores.length > 0) {
    return {
      ready: false,
      reason: `${finalWithoutScores.length} final fixtures have no scores`,
    };
  }

  // Settlement is irreversible on chain, so leave a window for a corrected
  // scoreline to land before committing.
  const latestResultUpdate = Math.max(
    ...fixtures.map((f) => new Date(f.updated_at ?? 0).getTime()),
    0,
  );
  const delayElapsed = Date.now() - latestResultUpdate;
  if (delayElapsed < CORRECTION_DELAY_MS) {
    const remaining = Math.ceil((CORRECTION_DELAY_MS - delayElapsed) / 1000);
    return {
      ready: false,
      reason: `Correction delay: ${remaining}s remaining`,
    };
  }

  const { count } = await admin
    .from("wager_entries")
    .select("id", { count: "exact", head: true })
    .eq("wager_round_id", wagerRoundId)
    .in("state", ["confirmed", "locked"]);

  if (!count) {
    return { ready: false, reason: "No confirmed entries" };
  }

  return { ready: true };
}

export interface SettleResult {
  settlementId: string;
  merkleRoot: string;
  manifestHash: string;
  winnerCount: number;
  totalDistributable: number;
  lockSignature?: string;
  settleSignature: string;
  alreadySettled: boolean;
}

/**
 * Build the manifest, lock the round if needed, record the result on chain, and
 * persist the settlement.
 *
 * Idempotent by way of `wager_settlements_one_per_round`: a round that already
 * has a settlement row returns it untouched. The on-chain `settle` is likewise
 * one-shot (Locked → Settled), so a retry after a partial failure re-derives the
 * same manifest — scoring reads the frozen pick snapshot and final scores — and
 * either completes the missing step or reports the round as already settled.
 */
export async function settleWagerRound(wagerRoundId: string): Promise<SettleResult> {
  const admin = createAdminSupabaseClient();
  const env = getWagerEnv();

  if (!env.settlementEnabled) {
    throw new Error("Settlement is disabled");
  }

  const { data: existing } = await admin
    .from("wager_settlements")
    .select("id, manifest_hash, merkle_root, winner_count, total_distributable, settled_at")
    .eq("wager_round_id", wagerRoundId)
    .maybeSingle();

  if (existing?.settled_at) {
    return {
      settlementId: existing.id,
      manifestHash: existing.manifest_hash as string,
      merkleRoot: existing.merkle_root as string,
      winnerCount: existing.winner_count,
      totalDistributable: Number(existing.total_distributable),
      settleSignature: "",
      alreadySettled: true,
    };
  }

  const readiness = await checkSettlementReadiness(wagerRoundId);
  if (!readiness.ready) {
    throw new Error(`Round is not ready to settle: ${readiness.reason}`);
  }

  const { data: round } = await admin
    .from("wager_rounds")
    .select("group_id, round_id, approved_mint, approved_token_program, state")
    .eq("id", wagerRoundId)
    .single();
  if (!round) throw new Error("Wager round not found");

  const { manifest, merkleLeaves } = await buildSettlementManifest(wagerRoundId);
  const canonicalBytes = canonicalManifestBytes(manifest);
  const manifestHash = hashManifest(canonicalBytes);

  const mint = addressFromBytes(requireBytea(round.approved_mint, 32, "approved_mint"));
  const tokenProgram = addressFromBytes(
    requireBytea(round.approved_token_program, 32, "approved_token_program"),
  );
  const wagerRoundPda = await deriveWagerRoundPda(round.group_id, round.round_id);
  const vault = await deriveVaultAta(wagerRoundPda.address, mint, tokenProgram);

  const authority = await loadWagerAuthoritySigner();

  // `lock` is permissionless and takes no signer, so it can ride in the same
  // transaction as `settle`; the program sees Initialized → Locked → Settled.
  const instructions = [];
  if (round.state === "initialized") {
    instructions.push(buildLockInstruction(address(env.programId), wagerRoundPda.address));
  }
  instructions.push(
    buildSettleInstruction(
      address(env.programId),
      {
        settlementAuthority: authority.address,
        wagerRound: wagerRoundPda.address,
        vault: vault.address,
      },
      {
        manifestHash,
        merkleRoot: manifest.merkleRoot,
        winnerCount: manifest.winnerCount,
        totalDistributable: BigInt(manifest.totalPot),
      },
    ),
  );

  const { signature } = await sendAndConfirmInstructions(instructions, authority);

  // Record the manifest before the claims so a winner can never be handed a
  // proof that has no settlement behind it.
  const { data: settlement, error: settlementError } = await admin
    .from("wager_settlements")
    .upsert(
      {
        wager_round_id: wagerRoundId,
        manifest_hash: bytesToBytea(manifestHash),
        manifest_canonical_bytes: Buffer.from(canonicalBytes).toString("base64"),
        merkle_root: bytesToBytea(manifest.merkleRoot),
        winner_count: manifest.winnerCount,
        total_distributable: manifest.totalPot,
        settled_at: new Date().toISOString(),
        correction_delay_elapsed_at: new Date().toISOString(),
      },
      { onConflict: "wager_round_id" },
    )
    .select("id")
    .single();

  if (settlementError || !settlement) {
    throw new Error(`Settled on-chain but failed to persist: ${settlementError?.message}`);
  }

  // Pending claim rows give each winner their award and let the claim route hand
  // out a proof without rebuilding the tree. The unique claim PDA index makes
  // this safe to re-run.
  const winners = manifest.entries.filter((e) => e.awardBaseUnits > 0);
  if (winners.length > 0) {
    const claimRows = await Promise.all(
      winners.map(async (w) => {
        const winnerAddress = addressFromBytes(w.walletPubkeyBytes);
        const claimPda = await deriveClaimPda(wagerRoundPda.address, winnerAddress);
        return {
          wager_round_id: wagerRoundId,
          settlement_id: settlement.id,
          user_id: w.userId,
          entry_id: w.entryId,
          wallet_address: bytesToBytea(w.walletPubkeyBytes),
          claim_pda: bytesToBytea(claimPda.bytes),
          award_base_units: w.awardBaseUnits,
          state: "pending" as const,
        };
      }),
    );

    const { error: claimsError } = await admin
      .from("wager_claims")
      .upsert(claimRows, { onConflict: "claim_pda", ignoreDuplicates: true });
    if (claimsError) {
      throw new Error(`Settled but failed to record claims: ${claimsError.message}`);
    }
  }

  // Reflect the terminal state locally; the chain is already authoritative.
  await admin.from("wager_rounds").update({ state: "settled" }).eq("id", wagerRoundId);
  await admin
    .from("wager_entries")
    .update({ state: "settled" })
    .eq("wager_round_id", wagerRoundId)
    .in("state", ["confirmed", "locked"]);

  return {
    settlementId: settlement.id,
    manifestHash: bytesToBytea(manifestHash),
    merkleRoot: bytesToBytea(manifest.merkleRoot),
    winnerCount: manifest.winnerCount,
    totalDistributable: manifest.totalPot,
    settleSignature: signature,
    alreadySettled: false,
  };
}
