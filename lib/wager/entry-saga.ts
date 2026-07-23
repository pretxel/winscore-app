/**
 * Wager entry saga state machine and persistence.
 *
 * wager_intents states:
 *   preparing → awaiting_signature → submitted → confirmed
 *   preparing → awaiting_signature → failed/expired
 *   submitted → reconciliation_required → confirmed/failed
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type IntentState =
  | "preparing"
  | "awaiting_signature"
  | "submitted"
  | "confirmed"
  | "failed"
  | "expired"
  | "reconciliation_required";

export type EntryState = "confirmed" | "locked" | "settled" | "cancelled" | "refunded";

const VALID_INTENT_TRANSITIONS: Record<IntentState, IntentState[]> = {
  preparing: ["awaiting_signature"],
  awaiting_signature: ["submitted", "failed", "expired"],
  submitted: ["confirmed", "reconciliation_required"],
  confirmed: [],
  failed: [],
  expired: [],
  reconciliation_required: ["confirmed", "failed"],
};

/**
 * Transition an intent's state, enforcing allowed durable transitions.
 * Treats client-provided state as unverified.
 */
export async function transitionIntentState(
  intentId: string,
  newState: IntentState,
): Promise<void> {
  const admin = createAdminSupabaseClient();

  const { data: intent } = await admin
    .from("wager_intents")
    .select("id, state")
    .eq("id", intentId)
    .single();

  if (!intent) {
    throw new Error(`Intent not found: ${intentId}`);
  }

  const allowed = VALID_INTENT_TRANSITIONS[intent.state as IntentState] ?? [];
  if (!allowed.includes(newState)) {
    throw new Error(`Invalid state transition: ${intent.state} -> ${newState}`);
  }

  await admin
    .from("wager_intents")
    .update({ state: newState })
    .eq("id", intentId)
    .eq("state", intent.state); // optimistic concurrency guard
}
