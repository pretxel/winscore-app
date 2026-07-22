"use server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getWagerEnv } from "@/lib/wager/env";

const CORRECTION_DELAY_MS = 3600_000; // 1 hour for Devnet

export async function checkSettlementReadiness(
  wagerRoundId: string,
): Promise<{ ready: boolean; reason?: string }> {
  const admin = createAdminSupabaseClient();
  const env = getWagerEnv();

  if (!env.settlementEnabled) {
    return { ready: false, reason: "Settlement is disabled" };
  }

  // Get wager round state
  const { data: wagerRound } = await admin
    .from("wager_rounds")
    .select("*")
    .eq("id", wagerRoundId)
    .single();

  if (!wagerRound) {
    return { ready: false, reason: "Wager round not found" };
  }

  if (wagerRound.state !== "initialized") {
    return { ready: false, reason: `Wager round state is ${wagerRound.state}, not initialized` };
  }

  // Check all fixtures are final or cancelled
  const { data: fixtures } = await admin
    .from("matches")
    .select("status, home_score, away_score, updated_at")
    .eq("round_id", wagerRound.round_id);

  const nonTerminal = (fixtures ?? []).filter(
    (f) => f.status !== "final" && f.status !== "cancelled",
  );
  if (nonTerminal.length > 0) {
    return {
      ready: false,
      reason: `${nonTerminal.length} fixtures are not final or cancelled`,
    };
  }

  // Check all final fixtures have scores
  const finalWithoutScores = (fixtures ?? []).filter(
    (f) => f.status === "final" && (f.home_score == null || f.away_score == null),
  );
  if (finalWithoutScores.length > 0) {
    return {
      ready: false,
      reason: `${finalWithoutScores.length} final fixtures have no scores`,
    };
  }

  // Check correction delay
  const latestResultUpdate = Math.max(
    ...(fixtures ?? []).map((f) => new Date(f.updated_at ?? 0).getTime()),
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

  // Check there are confirmed entries
  const { data: entries } = await admin
    .from("wager_entries")
    .select("id", { count: "exact", head: true })
    .eq("wager_round_id", wagerRoundId)
    .eq("state", "confirmed");

  if (!entries) {
    return { ready: false, reason: "No confirmed entries" };
  }

  return { ready: true };
}
