/**
 * Winner claims and cancellation refunds.
 *
 * Both are non-custodial: the server prepares an unsigned transaction and the
 * entrant's own wallet signs it, so a compromised server cannot move anyone's
 * funds. Replay protection is on chain — the Claim PDA is one-shot, and `refund`
 * flips the Entry to Refunded — with the database rows only mirroring it.
 */

import {
  type Address,
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  type Instruction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { findAssociatedTokenPda } from "@solana-program/token";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { bytesToBytea, requireBytea } from "@/lib/wager/bytea";
import { getWagerEnv } from "@/lib/wager/env";
import { buildClaimInstruction, buildRefundInstruction } from "@/lib/wager/instructions";
import { buildSettlementManifest } from "@/lib/wager/manifest";
import { buildMerkleTree, verifyMerkleProof } from "@/lib/wager/merkle-tree";
import {
  addressFromBytes,
  deriveClaimPda,
  deriveEntryPda,
  deriveVaultAta,
  deriveWagerRoundPda,
} from "@/lib/wager/pda";

export interface PreparedTransaction {
  transactionBase64: string;
  blockhash: string;
  lastValidBlockHeight: string;
}

export interface PrepareClaimResult extends PreparedTransaction {
  claimId: string;
  awardBaseUnits: number;
  proofLength: number;
}

/**
 * Prepare a winner's claim transaction.
 *
 * Rebuilds the Merkle tree from the settled manifest to derive this winner's
 * proof, rather than storing proofs, so a proof can never drift from the root
 * that was committed on chain. The proof is verified locally first: an invalid
 * one means the manifest and the on-chain root disagree, which is an operator
 * problem, not something to let the entrant discover as a failed transaction.
 *
 * @param userId The caller's own id. Callers must pass the authenticated user so
 * one entrant cannot prepare a claim against another's award.
 */
export async function prepareClaim(
  settlementId: string,
  userId: string,
): Promise<PrepareClaimResult> {
  const admin = createAdminSupabaseClient();
  const env = getWagerEnv();

  const { data: settlement } = await admin
    .from("wager_settlements")
    .select("id, wager_round_id, merkle_root, settled_at")
    .eq("id", settlementId)
    .single();

  if (!settlement) throw new Error("Settlement not found");
  if (!settlement.settled_at) throw new Error("Round is not settled yet");

  const { data: claim } = await admin
    .from("wager_claims")
    .select("id, state, award_base_units, wallet_address, entry_id")
    .eq("settlement_id", settlementId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!claim) throw new Error("No award to claim for this round");
  if (claim.state === "claimed") throw new Error("Already claimed");

  const { data: round } = await admin
    .from("wager_rounds")
    .select("group_id, round_id, approved_mint, approved_token_program")
    .eq("id", settlement.wager_round_id)
    .single();
  if (!round) throw new Error("Wager round not found");

  const mint = addressFromBytes(requireBytea(round.approved_mint, 32, "approved_mint"));
  const tokenProgram = addressFromBytes(
    requireBytea(round.approved_token_program, 32, "approved_token_program"),
  );
  const wagerRoundPda = await deriveWagerRoundPda(round.group_id, round.round_id);
  const vault = await deriveVaultAta(wagerRoundPda.address, mint, tokenProgram);

  const walletBytes = requireBytea(claim.wallet_address, 32, "wallet_address");
  const winner = addressFromBytes(walletBytes);
  const award = Number(claim.award_base_units);

  // Re-derive the tree the settlement committed to and pull this winner's proof.
  const { merkleLeaves } = await buildSettlementManifest(settlement.wager_round_id);
  const tree = buildMerkleTree(wagerRoundPda.bytes, merkleLeaves);
  const proof = tree.proofs.get(Buffer.from(walletBytes).toString("hex"));
  if (!proof) throw new Error("Winner is not present in the settlement tree");

  const committedRoot = requireBytea(settlement.merkle_root, 32, "merkle_root");
  if (Buffer.compare(Buffer.from(tree.root), Buffer.from(committedRoot)) !== 0) {
    throw new Error("Rebuilt Merkle root does not match the settled root");
  }
  if (!verifyMerkleProof(committedRoot, wagerRoundPda.bytes, walletBytes, award, proof)) {
    throw new Error("Merkle proof does not verify against the settled root");
  }

  const claimPda = await deriveClaimPda(wagerRoundPda.address, winner);
  const [winnerAta] = await findAssociatedTokenPda({ owner: winner, mint, tokenProgram });

  const instruction = buildClaimInstruction(
    address(env.programId),
    {
      winner,
      wagerRound: wagerRoundPda.address,
      claim: claimPda.address,
      vault: vault.address,
      winnerTokenAccount: winnerAta,
      tokenProgram,
    },
    { amount: BigInt(award), proof },
  );

  const prepared = await compileUnsignedTransaction(winner, [instruction]);

  return {
    ...prepared,
    claimId: claim.id,
    awardBaseUnits: award,
    proofLength: proof.length,
  };
}

/**
 * Prepare an entrant's refund transaction for a cancelled round. The program
 * reads the stake from the Entry account, so there is no amount to pass and
 * nothing for the server to get wrong.
 */
export async function prepareRefund(
  wagerRoundId: string,
  userId: string,
): Promise<PreparedTransaction & { entryId: string; stakeBaseUnits: number }> {
  const admin = createAdminSupabaseClient();
  const env = getWagerEnv();

  const { data: round } = await admin
    .from("wager_rounds")
    .select("group_id, round_id, approved_mint, approved_token_program, state")
    .eq("id", wagerRoundId)
    .single();
  if (!round) throw new Error("Wager round not found");
  if (round.state !== "cancelled") {
    throw new Error(`Round is ${round.state}, refunds require a cancelled round`);
  }

  const { data: entry } = await admin
    .from("wager_entries")
    .select("id, wallet_address, stake_base_units, state")
    .eq("wager_round_id", wagerRoundId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!entry) throw new Error("No entry to refund for this round");
  if (entry.state === "refunded") throw new Error("Already refunded");

  const mint = addressFromBytes(requireBytea(round.approved_mint, 32, "approved_mint"));
  const tokenProgram = addressFromBytes(
    requireBytea(round.approved_token_program, 32, "approved_token_program"),
  );
  const wagerRoundPda = await deriveWagerRoundPda(round.group_id, round.round_id);
  const vault = await deriveVaultAta(wagerRoundPda.address, mint, tokenProgram);

  const entrant = addressFromBytes(requireBytea(entry.wallet_address, 32, "wallet_address"));
  const entryPda = await deriveEntryPda(wagerRoundPda.address, entrant);
  const [entrantAta] = await findAssociatedTokenPda({ owner: entrant, mint, tokenProgram });

  const instruction = buildRefundInstruction(address(env.programId), {
    entrant,
    wagerRound: wagerRoundPda.address,
    entry: entryPda.address,
    vault: vault.address,
    entrantTokenAccount: entrantAta,
    tokenProgram,
  });

  const prepared = await compileUnsignedTransaction(entrant, [instruction]);

  return {
    ...prepared,
    entryId: entry.id,
    stakeBaseUnits: Number(entry.stake_base_units),
  };
}

async function compileUnsignedTransaction(
  feePayer: Address,
  instructions: Instruction[],
): Promise<PreparedTransaction> {
  const env = getWagerEnv();
  const rpc = createSolanaRpc(env.rpcUrl);
  const { value: blockhash } = await rpc.getLatestBlockhash({ commitment: env.commitment }).send();

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(feePayer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m),
  );

  return {
    transactionBase64: getBase64EncodedWireTransaction(compileTransaction(message)),
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight.toString(),
  };
}

/**
 * Move a round to Cancelled so entrants can refund.
 *
 * This only records the database side. The on-chain `cancel_and_refund` must be
 * sent by the round authority (or by anyone once `closes_at + refund_timeout`
 * passes); until it lands, `refund` will fail on chain regardless of this row.
 */
export async function activateRefund(
  wagerRoundId: string,
  reason: "admin" | "no_fixtures" | "timeout" | "assignment_change",
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminSupabaseClient();

  const { data: wagerRound } = await admin
    .from("wager_rounds")
    .select("id, closes_at, state, group_id, round_id")
    .eq("id", wagerRoundId)
    .in("state", ["initialized", "locked"])
    .maybeSingle();

  if (!wagerRound) {
    return { ok: false, error: "Wager round not found or not in cancellable state" };
  }

  if (reason === "timeout") {
    const closeTime = new Date(wagerRound.closes_at).getTime();
    const timeoutMs = 7 * 24 * 3600_000; // 7 days
    if (Date.now() < closeTime + timeoutMs) {
      return { ok: false, error: "Safety timeout has not elapsed" };
    }
  }

  await admin.from("wager_rounds").update({ state: "cancelled" }).eq("id", wagerRoundId);
  await admin
    .from("wager_entries")
    .update({ state: "cancelled" })
    .eq("wager_round_id", wagerRoundId)
    .in("state", ["confirmed", "locked"]);

  const wagerRoundPda = await deriveWagerRoundPda(wagerRound.group_id, wagerRound.round_id);
  await admin.from("wager_chain_events").insert({
    event_type: "cancel_requested",
    wager_round_pda: bytesToBytea(wagerRoundPda.bytes),
    parsed_data: { reason, cancelled_at: new Date().toISOString() },
    observed_at: new Date().toISOString(),
  });

  return { ok: true };
}
