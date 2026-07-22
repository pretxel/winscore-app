import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveCompetition, type ResolvedCompetition } from "@/lib/competition";
import {
  buildBracket,
  type Bracket,
  type BracketMatchInput,
} from "@/lib/bracket-core";

export type BracketResult = Bracket & {
  // Raw rows the bracket was built from, for opportunistic sync.
  matches: BracketMatchInput[];
};

// Build the projected knockout bracket for a competition: group + knockout
// fixtures folded through the pure resolver. Pass the league resolved from route
// context; omit to fall back to the active competition (transition behavior).
// Never throws — a missing competition or no knockout fixtures yields an empty,
// `hasKnockout: false` result.
export async function getBracket(
  competition?: ResolvedCompetition | null,
): Promise<BracketResult> {
  const comp = competition ?? (await getActiveCompetition());
  if (!comp) return { rounds: [], hasKnockout: false, matches: [] };

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("matches")
    .select(
      "id, home_team, away_team, group_code, home_score, away_score, status, kickoff_at, stage, venue",
    )
    .eq("competition_id", comp.id);

  const matches = (data ?? []) as BracketMatchInput[];
  return { ...buildBracket(matches), matches };
}
