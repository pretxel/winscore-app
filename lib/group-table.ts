import "server-only";
import { getActiveCompetition, type ResolvedCompetition } from "@/lib/competition";
import { getStageConfig, groupStageKey, leagueStageKey } from "@/lib/competition-schema";
import {
  buildGroupTables,
  buildLeagueTable,
  type GroupTableMatch,
  type SimulatedGroup,
  type Tiebreaker,
} from "@/lib/group-standings";
import type { ReadClient } from "@/lib/supabase/read-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type { GroupTableMatch } from "@/lib/group-standings";

export type GroupTablesResult = {
  // Real, results-derived standings for every group, A→L.
  groups: SimulatedGroup[];
  // The raw match rows the tables were built from, for opportunistic sync.
  matches: GroupTableMatch[];
  // False when the active competition has no group stage (or none is active);
  // the page renders an empty state rather than an error in that case.
  hasGroupStage: boolean;
};

// Build the real group tables for the active competition. Reads only the
// group-stage matches and folds their actual results into the shared standings
// engine. Never throws — a missing competition or group stage yields an empty,
// `hasGroupStage: false` result.
export async function getGroupTables(
  competition?: ResolvedCompetition | null,
): Promise<GroupTablesResult> {
  const comp = competition ?? (await getActiveCompetition());
  const groupKey = comp ? groupStageKey(comp.format) : null;
  if (!comp || !groupKey) {
    return { groups: [], matches: [], hasGroupStage: false };
  }

  return fetchGroupTables(await createServerSupabaseClient(), comp.id, groupKey);
}

export async function fetchGroupTables(
  supabase: ReadClient,
  competitionId: string,
  groupKey: string,
): Promise<GroupTablesResult> {
  const { data } = await supabase
    .from("matches")
    .select("id, home_team, away_team, group_code, home_score, away_score, status, kickoff_at")
    .eq("competition_id", competitionId)
    .eq("stage", groupKey);

  const matches = (data ?? []) as GroupTableMatch[];
  return { groups: buildGroupTables(matches), matches, hasGroupStage: true };
}

// Build the real league table for the active competition. Reads only the
// league-stage matches and folds their actual results into the shared standings
// engine. Never throws — a missing competition or league stage yields null.
export async function getLeagueTable(
  competition?: ResolvedCompetition | null,
): Promise<{ group: SimulatedGroup; matches: GroupTableMatch[] } | null> {
  const comp = competition ?? (await getActiveCompetition());
  const leagueKey = comp ? leagueStageKey(comp.format) : null;
  if (!comp || !leagueKey) return null;

  return fetchLeagueTable(await createServerSupabaseClient(), comp, leagueKey);
}

export async function fetchLeagueTable(
  supabase: ReadClient,
  comp: ResolvedCompetition,
  leagueKey: string,
): Promise<{ group: SimulatedGroup; matches: GroupTableMatch[] } | null> {
  const { data } = await supabase
    .from("matches")
    .select("id, home_team, away_team, group_code, home_score, away_score, status, kickoff_at")
    .eq("competition_id", comp.id)
    .eq("stage", leagueKey);

  const stageConfig = getStageConfig(comp.format, leagueKey);
  const tiebreaker: Tiebreaker = stageConfig?.tiebreaker ?? "gd";

  const matches = (data ?? []) as GroupTableMatch[];
  return { group: buildLeagueTable(matches, tiebreaker), matches };
}

// Re-exported so cached readers can type their return without reaching past
// this module into the standings engine.
export type { SimulatedGroup } from "@/lib/group-standings";
