import { createServerSupabaseClient } from "@/lib/supabase/server";
import { computePickCommitmentSync } from "@/lib/wager/pick-commitment";

interface CreateWagerIntentParams {
  groupId: string;
  roundId: string;
  userId: string;
  walletLinkId: string;
  picks: Array<{ matchId: string; homeGoals: number; awayGoals: number }>;
}

/**
 * Create (or return the existing) wager intent for this user + round.
 *
 * Delegates to the `create_wager_intent_and_snapshot` RPC, which — under row
 * locks — re-validates membership, wallet link, an initialized-and-open wager
 * round, and complete predictions, links the intent to its `wager_round_id`,
 * and snapshots the user's picks immutably. The caller must only reach this
 * once wagering is available for the round; failures surface as a null intent.
 */
export async function createWagerIntent({
  groupId,
  roundId,
  userId,
  walletLinkId,
  picks,
}: CreateWagerIntentParams) {
  const supabase = await createServerSupabaseClient();

  // One intent per (user, group, round) — return it if it already exists so
  // repeat page loads don't hit the unique constraint inside the RPC.
  const { data: existing } = await supabase
    .from("wager_intents")
    .select("id, state")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .eq("round_id", roundId)
    .maybeSingle();

  if (existing) {
    return { intentId: existing.id, state: existing.state };
  }

  const pickCommitmentBytes = computePickCommitmentSync({
    version: 1,
    groupId,
    roundId,
    userId,
    picks,
  });

  const { data, error } = await supabase.rpc("create_wager_intent_and_snapshot", {
    p_user_id: userId,
    p_group_id: groupId,
    p_round_id: roundId,
    p_wallet_link_id: walletLinkId,
    p_pick_commitment: `\\x${Buffer.from(pickCommitmentBytes).toString("hex")}`,
    p_canonicalization_version: 1,
  });

  if (error) {
    console.error("create_wager_intent_and_snapshot failed", error);
    return { intentId: null, state: null };
  }

  return { intentId: data as string, state: "preparing" as const };
}
