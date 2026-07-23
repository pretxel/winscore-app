import { randomUUID } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { computePickCommitmentSync } from "@/lib/wager/pick-commitment";

interface CreateWagerIntentParams {
  groupId: string;
  roundId: string;
  userId: string;
  walletLinkId: string;
  picks: Array<{ matchId: string; homeGoals: number; awayGoals: number }>;
}

export async function createWagerIntent({
  groupId,
  roundId,
  userId,
  walletLinkId,
  picks,
}: CreateWagerIntentParams) {
  const supabase = await createServerSupabaseClient();

  const pickCommitmentBytes = computePickCommitmentSync({
    groupId,
    roundId,
    userId,
    picks,
  });

  const idempotencyKey = randomUUID();

  const { data, error } = await supabase
    .from("wager_intents")
    .insert({
      user_id: userId,
      group_id: groupId,
      round_id: roundId,
      wallet_link_id: walletLinkId,
      pick_commitment: `\\x${Buffer.from(pickCommitmentBytes).toString("hex")}`,
      idempotency_key: idempotencyKey,
      state: "preparing",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("wager_intents")
        .select("id, state")
        .eq("user_id", userId)
        .eq("group_id", groupId)
        .eq("round_id", roundId)
        .single();

      if (existing) {
        return { intentId: existing.id, state: existing.state };
      }
    }
    console.error("Failed to create wager intent", error);
    return { intentId: null, state: null };
  }

  return { intentId: data.id, state: "preparing" as const };
}
