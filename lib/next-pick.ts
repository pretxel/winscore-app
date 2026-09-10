import "server-only";
import { isConfirmedMatch, soonestPickableMatch } from "@/lib/match-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type NextPickMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

// How far ahead to look. The next unpicked fixture is almost always within the
// next few kickoffs; a small window keeps this a cheap add-on to the match page
// rather than another season-sized read.
const LOOKAHEAD = 40;

/**
 * The soonest fixture in this league the signed-in user could still predict,
 * skipping `excludeMatchId` (the one they are on). Used to offer "predict the
 * next one" right after a pick is saved, so a player can work through a
 * matchday without going back to the list.
 *
 * Returns null when signed out, when nothing is left open, or on a read error —
 * the caller treats a missing suggestion as "just don't offer one".
 */
export async function getNextPickableMatch(
  leagueSlug: string,
  competitionId: string,
  userId: string | null,
  excludeMatchId: string,
): Promise<NextPickMatch | null> {
  if (!userId) return null;

  const supabase = await createServerSupabaseClient(leagueSlug);
  const { data: rows, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at, status")
    .eq("competition_id", competitionId)
    .eq("status", "scheduled")
    .gt("kickoff_at", new Date().toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(LOOKAHEAD);
  if (error || !rows || rows.length === 0) return null;

  // Knockout placeholders are visible but not pickable, so they can never be
  // the suggestion.
  const candidates = rows.filter((m) => m.id !== excludeMatchId && isConfirmedMatch(m));
  if (candidates.length === 0) return null;

  const { data: picks } = await supabase
    .from("predictions")
    .select("match_id")
    .eq("user_id", userId)
    .in(
      "match_id",
      candidates.map((m) => m.id),
    );
  const pickedIds = new Set((picks ?? []).map((p) => p.match_id));

  // soonestPickableMatch owns the "still open" rule, so this can't drift from
  // the lock logic the rest of the app uses.
  const next = soonestPickableMatch(candidates, pickedIds);
  if (!next) return null;
  return {
    id: next.id,
    homeTeam: next.home_team,
    awayTeam: next.away_team,
    kickoffAt: next.kickoff_at,
  };
}
