import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type MatchPick = {
  userId: string;
  displayName: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  points: number | null;
  hitType: "exact" | "winner_gd" | "winner" | "miss" | null;
};

// Picks for one locked match from everyone who shares a group with the caller
// in that league. The SQL function enforces the lock and the membership check,
// so an unlocked match or a signed-out caller yields []. Rows come back ordered
// for display: scored points first, then pickers before non-pickers, by name.
export async function getMatchPicks(matchId: string, leagueSlug?: string): Promise<MatchPick[]> {
  const supabase = await createServerSupabaseClient(leagueSlug);
  const { data, error } = await supabase.rpc("match_picks", { p_match_id: matchId });
  if (error) {
    console.error("[match-picks] load failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    homeGoals: r.home_goals,
    awayGoals: r.away_goals,
    points: r.points,
    hitType: r.hit_type as MatchPick["hitType"],
  }));
}
