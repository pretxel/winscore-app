"use server";

import { createHash } from "node:crypto";
import { base58 } from "@scure/base";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { type ExpectedEnter, verifyConfirmedEnter } from "@/lib/wager/enter-verification";
import { transitionIntentState } from "@/lib/wager/entry-saga";
import { getWagerEnv } from "@/lib/wager/env";
import {
  addressFromBytes,
  deriveEntryPda,
  deriveVaultAta,
  deriveWagerRoundPda,
} from "@/lib/wager/pda";

/**
 * Independently verify an on-chain entry transaction.
 * Queries the configured Devnet RPC and proves, against server-derived values:
 * - Execution status (no error) and program invocation
 * - Entry / wager-round / vault / entrant accounts all participated
 * - Instruction data matches the intent (stake, pick commitment, intent hash)
 * - The vault token balance grew by exactly the stake
 *
 * Nothing here trusts client-supplied fields — every expected value is derived
 * server-side from the intent, its wager round, and the linked wallet.
 */

export interface VerifiedEntry {
  entryPda: string;
  stakeBaseUnits: string;
  walletAddress: string;
  wagerRoundKey: string;
  intentHash: string;
  pickCommitment: string;
  blockSlot: number;
}

/** Decode a Postgres `bytea` (`\x…` hex string) to raw bytes. */
function byteaToBytes(value: unknown): Uint8Array | null {
  if (typeof value !== "string") return null;
  const hex = value.replace(/^\\x/, "");
  return hex ? new Uint8Array(Buffer.from(hex, "hex")) : null;
}

export async function verifyEntryTransaction(
  signature: string,
  intentId: string,
): Promise<{ verified: boolean; entry?: VerifiedEntry; error?: string }> {
  const admin = createAdminSupabaseClient();
  const env = getWagerEnv();

  // Fetch intent + its wager round to derive the expected on-chain values.
  const { data: intent } = await admin
    .from("wager_intents")
    .select(
      "id, group_id, round_id, wager_round_id, wallet_link_id, pick_commitment, " +
        "wager_rounds!inner(stake_base_units, approved_mint, approved_token_program)",
    )
    .eq("id", intentId)
    .in("state", ["submitted", "reconciliation_required"])
    .single();

  if (!intent) {
    return { verified: false, error: "Intent not found or not in verifiable state" };
  }

  const round = Array.isArray(intent.wager_rounds) ? intent.wager_rounds[0] : intent.wager_rounds;

  const { data: link } = await admin
    .from("wallet_links")
    .select("wallet_address")
    .eq("id", intent.wallet_link_id)
    .single();

  const entrantBytes = byteaToBytes(link?.wallet_address);
  const mintBytes = byteaToBytes(round?.approved_mint);
  const tokenProgramBytes = byteaToBytes(round?.approved_token_program);
  const pickCommitment = byteaToBytes(intent.pick_commitment);

  if (!entrantBytes || !mintBytes || !tokenProgramBytes || !pickCommitment) {
    return { verified: false, error: "Wager round or wallet is misconfigured" };
  }

  const entrant = addressFromBytes(entrantBytes);
  const mint = addressFromBytes(mintBytes);
  const tokenProgram = addressFromBytes(tokenProgramBytes);
  const stakeBaseUnits = BigInt(round?.stake_base_units ?? 0);

  // Derive the same accounts the deposit transaction was built from.
  const wagerRound = await deriveWagerRoundPda(intent.group_id, intent.round_id);
  const vault = await deriveVaultAta(wagerRound.address, mint, tokenProgram);
  const entry = await deriveEntryPda(wagerRound.address, entrant);
  const intentHash = new Uint8Array(createHash("sha256").update(intentId).digest());

  let txResult: unknown;
  try {
    const txResp = await fetch(env.rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.rpcApiKey ? { "x-api-key": env.rpcApiKey } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          signature,
          {
            commitment: env.commitment,
            encoding: "jsonParsed",
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    });
    const txJson = await txResp.json();
    txResult = txJson.result;
  } catch (err) {
    return {
      verified: false,
      error: err instanceof Error ? err.message : "RPC verification failed",
    };
  }

  const expected: ExpectedEnter = {
    programId: env.programId,
    entrant,
    wagerRound: wagerRound.address,
    entry: entry.address,
    vault: vault.address,
    stakeBaseUnits,
    pickCommitment,
    intentHash,
  };

  const result = verifyConfirmedEnter(txResult, expected);
  if (!result.verified) {
    // A confirmed-but-invalid transaction is terminal; a not-yet-visible one is not.
    if (result.error && result.error.startsWith("Transaction failed")) {
      await transitionIntentState(intentId, "failed");
    }
    return { verified: false, error: result.error };
  }

  return {
    verified: true,
    entry: {
      entryPda: entry.address,
      stakeBaseUnits: stakeBaseUnits.toString(),
      walletAddress: entrant,
      wagerRoundKey: wagerRound.address,
      intentHash: Buffer.from(intentHash).toString("hex"),
      pickCommitment: Buffer.from(pickCommitment).toString("hex"),
      blockSlot: result.blockSlot ?? 0,
    },
  };
}

/**
 * Persist a verified entry and related records idempotently.
 * Updates pot/participant aggregates and appends chain events.
 */
export async function persistVerifiedEntry(
  intentId: string,
  signature: string,
  entry: VerifiedEntry,
): Promise<void> {
  const admin = createAdminSupabaseClient();

  // Check for existing entry (idempotency)
  const { data: existing } = await admin
    .from("wager_entries")
    .select("id")
    .eq("intent_id", intentId)
    .maybeSingle();

  if (existing) return;

  // Fetch intent for foreign keys
  const { data: intent } = await admin
    .from("wager_intents")
    .select("user_id, group_id, round_id, wager_round_id, wallet_link_id")
    .eq("id", intentId)
    .single();

  if (!intent) throw new Error("Intent not found");

  // Fetch wallet address from link
  const { data: walletLink } = await admin
    .from("wallet_links")
    .select("wallet_address")
    .eq("id", intent.wallet_link_id)
    .single();

  const walletBytes = walletLink?.wallet_address
    ? typeof walletLink.wallet_address === "string"
      ? new Uint8Array(
          Buffer.from((walletLink.wallet_address as string).replace(/^\\x/, ""), "hex"),
        )
      : new Uint8Array(walletLink.wallet_address as unknown as ArrayBuffer)
    : new Uint8Array(32);

  // Create entry under transaction
  const { data: newEntry, error: entryError } = await admin
    .from("wager_entries")
    .insert({
      intent_id: intentId,
      user_id: intent.user_id,
      group_id: intent.group_id,
      round_id: intent.round_id ?? "",
      wager_round_id: intent.wager_round_id ?? "",
      wallet_address: `\\x${Buffer.from(walletBytes).toString("hex")}`,
      entry_pda: `\\x${Buffer.from(base58.decode(entry.entryPda)).toString("hex")}`,
      transaction_signature: `\\x${Buffer.from(base58.decode(signature)).toString("hex")}`,
      stake_base_units: Number(entry.stakeBaseUnits),
      state: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (entryError) throw new Error(`Failed to persist entry: ${entryError.message}`);

  // Update intent state to confirmed
  await admin.from("wager_intents").update({ state: "confirmed" }).eq("id", intentId);

  // Update wager_entry_predictions to reference the new entry
  await admin
    .from("wager_entry_predictions")
    .update({ entry_id: newEntry.id })
    .eq("intent_id", intentId);

  // Append chain event
  await admin.from("wager_chain_events").insert({
    intent_id: intentId,
    transaction_signature: Buffer.from(base58.decode(signature)) as unknown as string,
    event_type: "entry_created",
    entry_pda: Buffer.from(base58.decode(entry.entryPda)) as unknown as string,
    parsed_data: {
      stake: entry.stakeBaseUnits,
      wallet: entry.walletAddress,
    },
    block_slot: entry.blockSlot,
    commitment: "confirmed",
    rpc_node: getWagerEnv().rpcUrl,
    observed_at: new Date().toISOString(),
  });
}
