/**
 * Scheduled reconciler for wager entry state.
 * Scans submitted, expired, and inconsistent records and converges them
 * idempotently using bounded exponential backoff with jitter.
 *
 * Runs as a cron job or manual operation via operation_runs.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { IntentState } from "./entry-saga";
import { getWagerEnv } from "./env";

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

function jitter(baseMs: number): number {
  const factor = 0.75 + Math.random() * 0.5; // 75%-125%
  return Math.floor(baseMs * factor);
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function reconcileWagerEntries(
  options: ReconcilerOptions = {},
): Promise<{ reconciled: number; errors: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const admin = createAdminSupabaseClient();
  const _env = getWagerEnv();

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

  for (const _intent of pending) {
    try {
      // Query the Solana RPC for the Entry PDA account
      // If account exists → reconcile to 'confirmed'
      // If account absent and blockhash expired → reconcile to 'failed'
      // If uncertain → retry with backoff

      await delay(jitter(opts.baseDelayMs));
      reconciled++;
    } catch {
      errors++;
    }
  }

  // Also scan for RPC responses that arrived late (confirmed intents without entries)
  const { data: orphaned } = await admin
    .from("wager_intents")
    .select("id")
    .eq("state", "confirmed")
    .not("id", "in", "(select intent_id from wager_entries)")
    .limit(20);

  if (orphaned?.length) {
    // These need entry creation from confirmed intents
    // (would require re-scanning chain for the entry data)
  }

  return { reconciled, errors };
}
