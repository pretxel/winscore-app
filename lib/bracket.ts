import "server-only";
import { type Bracket, type BracketMatchInput, buildBracket } from "@/lib/bracket-core";
import { getActiveCompetition, type ResolvedCompetition } from "@/lib/competition";
import type { ReadClient } from "@/lib/supabase/read-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type BracketResult = Bracket & {
  // Raw rows the bracket was built from, for opportunistic sync.
  matches: BracketMatchInput[];
};

// Build the projected knockout bracket for a competition: group + knockout
// fixtures folded through the pure resolver. Pass the league resolved from route
// context; omit to fall back to the active competition (transition behavior).
// Never throws — a missing competition or no knockout fixtures yields an empty,
// `hasKnockout: false` result.
export async function getBracket(competition?: ResolvedCompetition | null): Promise<BracketResult> {
  const comp = competition ?? (await getActiveCompetition());
  if (!comp) return { rounds: [], hasKnockout: false, matches: [] };
  return fetchBracket(await createServerSupabaseClient(), comp);
}

// Client-parameterised body, so a cached reader can run the same query through
// the public client.
export async function fetchBracket(
  supabase: ReadClient,
  comp: ResolvedCompetition,
): Promise<BracketResult> {
  const { data } = await supabase
    .from("matches")
    .select(
      "id, home_team, away_team, group_code, home_score, away_score, status, kickoff_at, stage, venue",
    )
    .eq("competition_id", comp.id);

  const matches = (data ?? []) as BracketMatchInput[];
  return { ...buildBracket(matches), matches };
}
