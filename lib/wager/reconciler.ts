/**
 * Scheduled reconciler for wager entry state.
 * Scans submitted and reconciliation-required intents and converges them
 * idempotently using bounded backoff with jitter between RPC calls.
 *
 * Reconciliation is anchored on the deterministic Entry PDA: signatures that
 * touched the PDA are fetched from the RPC and each successful one is proven
 * against the intent by verifyEntryTransaction before an entry is recorded.
 * A confirmed signature alone is never trusted.
 *
 * Runs as a cron job or manual operation via operation_runs.
 */

import { createSolanaRpc } from "@solana/kit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { IntentState } from "./entry-saga";
import { getWagerEnv } from "./env";
import { addressFromBytes, deriveEntryPda, deriveWagerRoundPda } from "./pda";
import { persistVerifiedEntry, verifyEntryTransaction } from "./verify-entry";

interface ReconcilerOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<ReconcilerOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/** How many recent signatures on the Entry PDA to inspect per intent. */
const SIGNATURE_SCAN_LIMIT = 10;

function jitter(baseMs: number): number {
  const factor = 0.75 + Math.random() * 0.5; // 75%-125%
  return Math.floor(baseMs * factor);
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Decode a Postgres `bytea` (`\x…` hex string) to raw bytes. */
function byteaToBytes(value: unknown): Uint8Array | null {
  if (typeof value !== "string") return null;
  const hex = value.replace(/^\\x/, "");
  return hex ? new Uint8Array(Buffer.from(hex, "hex")) : null;
}

export async function reconcileWagerEntries(
  options: ReconcilerOptions = {},
): Promise<{ reconciled: number; errors: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const admin = createAdminSupabaseClient();
  const env = getWagerEnv();
  const rpc = createSolanaRpc(env.rpcUrl);

  let reconciled = 0;
  let errors = 0;

  // Find intents that need reconciliation
  const { data: pending } = await admin
    .from("wager_intents")
    .select(
      "id, state, pick_commitment, user_id, group_id, round_id, wager_round_id, wallet_link_id",
    )
    .in("state", ["submitted", "reconciliation_required"] as IntentState[])
    .order("created_at", { ascending: true })
    .limit(50);

  if (!pending?.length) {
    return { reconciled, errors };
  }

  for (const intent of pending) {
    try {
      await delay(jitter(opts.baseDelayMs));

      // Resolve the entrant wallet, then derive the deterministic Entry PDA.
      const { data: link } = await admin
        .from("wallet_links")
        .select("wallet_address")
        .eq("id", intent.wallet_link_id)
        .single();

      const entrantBytes = byteaToBytes(link?.wallet_address);
      if (!entrantBytes) {
        errors++;
        continue;
      }
      const entrant = addressFromBytes(entrantBytes);
      const wagerRound = await deriveWagerRoundPda(intent.group_id, intent.round_id);
      const entry = await deriveEntryPda(wagerRound.address, entrant);

      // Signatures on the Entry PDA. An absent account returns none, so a
      // non-empty result means the account exists and the enter succeeded.
      const signatures = await rpc
        .getSignaturesForAddress(entry.address, { limit: SIGNATURE_SCAN_LIMIT })
        .send();

      let converged = false;
      for (const sig of signatures) {
        // Skip failed transactions; only a successful enter can be the deposit.
        if (sig.err) continue;

        const verification = await verifyEntryTransaction(sig.signature, intent.id);
        if (verification.verified && verification.entry) {
          await persistVerifiedEntry(intent.id, sig.signature, verification.entry);
          reconciled++;
          converged = true;
          break;
        }
      }

      // Not yet verifiable — leave for a subsequent run to retry with backoff.
      if (!converged) continue;
    } catch {
      errors++;
    }
  }

  return { reconciled, errors };
}
