import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LaneFixture = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  kickoffAt: string;
};

// Live + next-up fixtures for one league lane on the cross-league home. Scoped to
// the league via the x-league header (createServerSupabaseClient(slug)), so the
// matches RLS/view resolves this league only. Live matches sort first, then the
// soonest upcoming kickoffs; capped so the lane strip stays compact.
export async function getLeagueLaneFixtures(slug: string): Promise<LaneFixture[]> {
  const supabase = await createServerSupabaseClient(slug);
  const { data } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, status, kickoff_at")
    .in("status", ["live", "scheduled"])
    .order("kickoff_at", { ascending: true })
    .limit(8);

  const now = Date.now();
  return (data ?? [])
    .map((m) => ({
      id: m.id,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      homeScore: m.home_score,
      awayScore: m.away_score,
      status: m.status,
      kickoffAt: m.kickoff_at,
    }))
    // Keep live matches and upcoming kickoffs; drop stale scheduled rows.
    .filter((m) => m.status === "live" || new Date(m.kickoffAt).getTime() >= now)
    // Live first, then by kickoff (the query already ordered by kickoff).
    .sort((a, b) => Number(b.status === "live") - Number(a.status === "live"))
    .slice(0, 4);
}
