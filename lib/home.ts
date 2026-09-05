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

// Live + next-up fixtures for one league lane on the cross-league home. The
// matches table's select policy is public and unscoped (the x-league header only
// scopes the derived views), so the league is filtered explicitly by
// competition id. Live matches sort first, then the soonest upcoming kickoffs;
// capped so the lane strip stays compact.
export async function getLeagueLaneFixtures(
  slug: string,
  competitionId: string,
): Promise<LaneFixture[]> {
  const supabase = await createServerSupabaseClient(slug);
  const { data } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, status, kickoff_at")
    .eq("competition_id", competitionId)
    .in("status", ["live", "scheduled"])
    .order("kickoff_at", { ascending: true })
    .limit(8);

  const now = Date.now();
  return (
    (data ?? [])
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
      .slice(0, 4)
  );
}

export type LeagueRoster = {
  // Distinct team names in kickoff order of first appearance, placeholders
  // ("Winner Group A") excluded so the crest cluster only shows real sides.
  teams: string[];
  matchCount: number;
  liveCount: number;
};

// Who plays in a league and how much of it there is — the catalog card's
// substance. One scoped query per league; the catalog has a handful, so this
// stays cheap. Filtered by competition id for the same reason as above.
export async function getLeagueRoster(slug: string, competitionId: string): Promise<LeagueRoster> {
  const supabase = await createServerSupabaseClient(slug);
  const { data } = await supabase
    .from("matches")
    .select("home_team, away_team, status")
    .eq("competition_id", competitionId)
    .order("kickoff_at", { ascending: true });

  const seen = new Set<string>();
  let liveCount = 0;
  for (const m of data ?? []) {
    if (m.status === "live") liveCount += 1;
    for (const team of [m.home_team, m.away_team]) {
      if (team && !isPlaceholderTeam(team)) seen.add(team);
    }
  }
  return { teams: [...seen], matchCount: data?.length ?? 0, liveCount };
}

// Knockout slots before they resolve: "Winner Group A", "Runner-up Group B",
// "1A", "2B", "W49"... Anything that isn't a proper team name.
function isPlaceholderTeam(name: string): boolean {
  return /^(winner|runner|loser|1st|2nd|3rd|[123][A-L]|W\d+|L\d+|TBD|TBC)/i.test(name.trim());
}
