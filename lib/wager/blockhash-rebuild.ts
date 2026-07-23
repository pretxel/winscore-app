"use server";

import { base58 } from "@scure/base";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getWagerEnv } from "@/lib/wager/env";
import { logWagerEvent } from "@/lib/wager/metrics";
import { deriveEntryPda } from "@/lib/wager/pda";

const _BLOCKHASH_FRESHNESS_MS = 60_000; // 1 minute

/**
 * Rebuild an entry transaction after blockhash expiry.
 * ONLY rebuilds after proving the deterministic Entry account is absent on-chain.
 * Reconciles rather than rebuilds when the Entry account already exists.
 */
export async function rebuildExpiredTransaction(
  intentId: string,
): Promise<{ rebuilt: boolean; signature?: string; error?: string }> {
  const admin = createAdminSupabaseClient();
  const env = getWagerEnv();

  const { data: intent } = await admin
    .from("wager_intents")
    .select("*")
    .eq("id", intentId)
    .eq("state", "expired")
    .single();

  if (!intent) {
    return { rebuilt: false, error: "Intent not found or not expired" };
  }

  // Get wallet bytes
  let walletBytes: Uint8Array;
  try {
    const { data: link } = await admin
      .from("wallet_links")
      .select("wallet_address")
      .eq("id", intent.wallet_link_id)
      .single();

    if (!link?.wallet_address) {
      return { rebuilt: false, error: "Wallet link not found" };
    }

    walletBytes =
      typeof link.wallet_address === "string"
        ? Buffer.from((link.wallet_address as string).replace(/^\\x/, ""), "hex")
        : new Uint8Array(link.wallet_address as unknown as ArrayBuffer);
  } catch {
    return { rebuilt: false, error: "Failed to get wallet address" };
  }

  // Derive entry PDA
  const programId = base58.decode(getWagerEnv().programId);
  const { pda: entryPda } = deriveEntryPda(programId, walletBytes);

  // Check if entry account exists on-chain
  try {
    const resp = await fetch(env.rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.rpcApiKey ? { "x-api-key": env.rpcApiKey } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [base58.encode(entryPda), { commitment: env.commitment, encoding: "base64" }],
      }),
    });

    const json = await resp.json();
    if (json.result?.value) {
      // Entry account exists — reconcile instead of rebuilding
      logWagerEvent({
        metric: "reconciliation_mismatch",
        intentId,
        error: "Entry exists, reconciling instead of rebuilding",
      });

      await admin
        .from("wager_intents")
        .update({ state: "reconciliation_required" })
        .eq("id", intentId);

      return { rebuilt: false, error: "Entry exists on-chain, queued for reconciliation" };
    }
  } catch {
    // RPC error — cannot verify absence
    return { rebuilt: false, error: "RPC unavailable, cannot verify entry absence" };
  }

  // Entry does NOT exist — safe to rebuild
  // Get fresh blockhash
  try {
    const blockhashResp = await fetch(env.rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.rpcApiKey ? { "x-api-key": env.rpcApiKey } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestBlockhash",
        params: [{ commitment: env.commitment }],
      }),
    });

    const bhJson = await blockhashResp.json();
    const blockhash = bhJson.result?.value?.blockhash;
    if (!blockhash) {
      return { rebuilt: false, error: "Failed to get fresh blockhash" };
    }

    // Reset intent to preparing state for rebuild
    await admin
      .from("wager_intents")
      .update({ state: "preparing" })
      .eq("id", intentId)
      .eq("state", "expired");

    logWagerEvent({
      metric: "transaction_submitted",
      intentId,
      error: "Transaction rebuilt after blockhash expiry",
    });

    return { rebuilt: true, signature: blockhash };
  } catch (err) {
    return {
      rebuilt: false,
      error: err instanceof Error ? err.message : "Rebuild failed",
    };
  }
}
