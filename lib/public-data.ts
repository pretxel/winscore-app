import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { type BracketResult, fetchBracket } from "@/lib/bracket";
import { CATALOG_TAG, leagueTag, matchTag, NEWS_TAG } from "@/lib/cache-tags";
import {
  fetchCatalogLeagues,
  fetchLeagueBySlug,
  type LeagueCatalogEntry,
  type ResolvedCompetition,
} from "@/lib/competition";
import { groupStageKey, leagueStageKey } from "@/lib/competition-schema";
import type { LeaderboardRow, MatchRow, NewsArticleRow } from "@/lib/db";
import {
  fetchGroupTables,
  fetchLeagueTable,
  type GroupTableMatch,
  type GroupTablesResult,
  type SimulatedGroup,
} from "@/lib/group-table";
import {
  getLeagueLaneFixtures,
  getLeagueRoster,
  type LaneFixture,
  type LeagueRoster,
} from "@/lib/home";
import type { Locale } from "@/lib/i18n";
import { getDefaultScheme, listPhases, type Phase, type PhaseScheme } from "@/lib/phases";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

// Every cached read of shared content lives here.
//
// These run through the cookie-free public client, so they are callable from
// inside `use cache` — which forbids cookies, headers and searchParams. They
// are `use cache: remote` rather than plain `use cache` because on Vercel the
// default cache is per-instance memory that does not survive between
// serverless invocations; without `remote` the entries would rarely be hit.
//
// Each one tags what it derives from, using the vocabulary in lib/cache-tags,
// so the writes that change that thing can invalidate it.

/** The league catalog: every browsable competition. */
export async function getCachedCatalogLeagues(): Promise<LeagueCatalogEntry[]> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  return fetchCatalogLeagues(createPublicSupabaseClient());
}

/** One league's record, resolved from its slug. */
export async function getCachedLeague(slug: string): Promise<ResolvedCompetition | null> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  return fetchLeagueBySlug(createPublicSupabaseClient(slug), slug);
}

/** A league's teams and match counts, for its catalog card. */
export async function getCachedLeagueRoster(
  slug: string,
  competitionId: string,
): Promise<LeagueRoster> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  return getLeagueRoster(slug, competitionId, createPublicSupabaseClient(slug));
}

/** A league's live and next fixtures, for its catalog card and home lane. */
export async function getCachedLaneFixtures(
  slug: string,
  competitionId: string,
): Promise<LaneFixture[]> {
  "use cache: remote";
  // Shorter than the rest: this strip carries live scores, so a stale hour
  // would show an old scoreline on a page nobody thinks of as cached.
  cacheLife("minutes");
  cacheTag(leagueTag(slug));
  return getLeagueLaneFixtures(slug, competitionId, createPublicSupabaseClient(slug));
}

/** The real group tables for a league, or an empty result when it has no group stage. */
export async function getCachedGroupTables(
  slug: string,
  competitionId: string,
  format: ResolvedCompetition["format"] | null,
): Promise<GroupTablesResult> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  const groupKey = format ? groupStageKey(format) : null;
  if (!groupKey || !competitionId) return { groups: [], matches: [], hasGroupStage: false };
  return fetchGroupTables(createPublicSupabaseClient(slug), competitionId, groupKey);
}

/** The real league table, or null when the competition has no league stage. */
export async function getCachedLeagueTable(
  slug: string,
  comp: ResolvedCompetition,
): Promise<{ group: SimulatedGroup; matches: GroupTableMatch[] } | null> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  const leagueKey = leagueStageKey(comp.format);
  if (!leagueKey) return null;
  return fetchLeagueTable(createPublicSupabaseClient(slug), comp, leagueKey);
}

/** The knockout bracket projected from a league's fixtures. */
export async function getCachedBracket(
  slug: string,
  comp: ResolvedCompetition,
): Promise<BracketResult> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  return fetchBracket(createPublicSupabaseClient(slug), comp);
}

/** The first page of the news feed; the rest streams in client-side. */
export async function getCachedNewsPage(
  pageSize: number,
): Promise<{ articles: NewsArticleRow[]; error: string | null }> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(NEWS_TAG);
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, pageSize - 1);
  return { articles: (data ?? []) as NewsArticleRow[], error: error?.message ?? null };
}

// --- Rankings ---------------------------------------------------------------
// A read failure is carried alongside the rows rather than swallowed, so the
// page can still tell "nobody has scored" from "the board could not load".
export type BoardResult = { rows: LeaderboardRow[]; error: string | null };

// All four leaderboard variants are shared: the same ordering for every
// visitor. Only the "you" highlight is personal, and that is derived from the
// viewer's id against these rows, not from another query.

/** The all-time board for a league. */
export async function getCachedOverallBoard(slug: string): Promise<BoardResult> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  const { data, error } = await createPublicSupabaseClient(slug)
    .from("v_leaderboard_overall")
    .select("*")
    .order("rank", { ascending: true });
  return { rows: (data ?? []) as LeaderboardRow[], error: error?.message ?? null };
}

/**
 * The board for one time window. The bounds are arguments rather than computed
 * here: `use cache` evaluates the clock once, so a week resolved inside would
 * freeze. Passing them in also makes each week its own cache entry.
 */
export async function getCachedWindowBoard(
  slug: string,
  fromTs: string,
  toTs: string,
): Promise<BoardResult> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  const { data, error } = await createPublicSupabaseClient(slug).rpc("leaderboard_for_window", {
    from_ts: fromTs,
    to_ts: toTs,
  });
  return { rows: (data ?? []) as LeaderboardRow[], error: error?.message ?? null };
}

/** The board for one tournament stage. */
export async function getCachedStageBoard(slug: string, stageKey: string): Promise<BoardResult> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  const { data, error } = await createPublicSupabaseClient(slug).rpc("leaderboard_for_stage", {
    stage_key: stageKey,
  });
  return { rows: (data ?? []) as LeaderboardRow[], error: error?.message ?? null };
}

/** The board for one phase of a scheme. */
export async function getCachedPhaseBoard(slug: string, phaseId: string): Promise<BoardResult> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  const { data, error } = await createPublicSupabaseClient(slug).rpc("leaderboard_for_phase", {
    p_phase_id: phaseId,
  });
  return { rows: (data ?? []) as LeaderboardRow[], error: error?.message ?? null };
}

// --- Phase schemes ----------------------------------------------------------
// The scheme and its phases are competition-level facts: same for everyone,
// changed only by an admin.

/** The competition's default phase scheme, or null when it has none. */
export async function getCachedDefaultScheme(
  slug: string,
  competitionId: string,
  locale: Locale,
): Promise<PhaseScheme | null> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  return getDefaultScheme(competitionId, locale, createPublicSupabaseClient(slug));
}

/** A scheme's phases, in display order, with their derived ends. */
export async function getCachedPhases(
  slug: string,
  schemeId: string,
  locale: Locale,
): Promise<Phase[]> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  return listPhases(schemeId, locale, createPublicSupabaseClient(slug));
}

// --- Fixtures ---------------------------------------------------------------

/**
 * A league's whole fixture list, ordered by kickoff.
 *
 * Minutes rather than hours: these rows carry live scores and statuses, and an
 * hour-stale scoreline on the page people watch during a match is worse than a
 * few extra queries. The result sync also invalidates the league tag on every
 * write, so in practice a score reaches this list on the next request.
 */
export async function getCachedLeagueFixtures(
  slug: string,
  competitionId: string,
): Promise<{ matches: MatchRow[]; error: string | null }> {
  "use cache: remote";
  cacheLife("minutes");
  cacheTag(leagueTag(slug));
  // Explicit column list rather than `*`: a season's fixture list is hundreds
  // of rows, and the audit/provider columns the page never reads are pure
  // transfer cost between Postgres and the render.
  const { data, error } = await createPublicSupabaseClient(slug)
    .from("matches")
    .select(
      "id, stage, group_code, home_team, away_team, kickoff_at, venue, home_score, away_score, status, competition_id, round_id, tie_key, leg",
    )
    .eq("competition_id", competitionId)
    .order("kickoff_at", { ascending: true });
  return { matches: (data ?? []) as MatchRow[], error: error?.message ?? null };
}

// --- One match -------------------------------------------------------------
// Everything on a match page that is the same for every visitor: the fixture
// itself, its live feed, its AI recap and the recap's comic. Each is tagged
// with both the match and its league, so a result sync can invalidate one
// fixture without dropping the whole league.

/** One fixture, by id. */
export async function getCachedMatch(slug: string, matchId: string): Promise<MatchRow | null> {
  "use cache: remote";
  // Minutes, like the fixture list: this row carries the live score.
  cacheLife("minutes");
  cacheTag(leagueTag(slug), matchTag(matchId));
  const { data } = await createPublicSupabaseClient(slug)
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  return (data as MatchRow | null) ?? null;
}

export type MatchEventRow = {
  id: string;
  type: string;
  team: string | null;
  minute: number | null;
  extra_minute: number | null;
  sequence: number;
  player: string | null;
  detail: string | null;
};

/** A match's live feed events, in order. */
export async function getCachedMatchEvents(
  slug: string,
  matchId: string,
): Promise<MatchEventRow[]> {
  "use cache: remote";
  // The whole point of this feed is to follow a match as it happens.
  cacheLife("minutes");
  cacheTag(leagueTag(slug), matchTag(matchId));
  const { data } = await createPublicSupabaseClient(slug)
    .from("match_events")
    .select("id, type, team, minute, extra_minute, sequence, player, detail")
    .eq("match_id", matchId)
    .order("sequence", { ascending: true });
  return (data ?? []) as MatchEventRow[];
}

/**
 * A finished match's active AI recap and its rendered comic.
 *
 * Hours rather than minutes: a recap is written once after the final whistle
 * and then never changes, and the comic render that follows it invalidates the
 * match tag when it completes.
 */
export async function getCachedMatchRecap(
  slug: string,
  matchId: string,
): Promise<{ summary: { id: string; content: string } | null; imagePath: string | null }> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug), matchTag(matchId));
  const supabase = createPublicSupabaseClient(slug);
  const [summaryRes, renderRes] = await Promise.all([
    supabase
      .from("match_summaries")
      .select("id, content")
      .eq("match_id", matchId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("match_summary_images")
      .select("storage_path")
      .eq("match_id", matchId)
      .eq("status", "complete")
      .maybeSingle(),
  ]);
  return {
    summary: summaryRes.data ?? null,
    imagePath: renderRes.data?.storage_path ?? null,
  };
}

/** Whether a competition has been wrapped up, which freezes its pages. */
export async function getCachedCompetitionFinished(
  slug: string,
  competitionId: string,
): Promise<boolean> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  const { data } = await createPublicSupabaseClient(slug)
    .from("competitions")
    .select("finished_at")
    .eq("id", competitionId)
    .maybeSingle();
  return Boolean(data?.finished_at);
}

/** The fixtures of one group, for the personal group simulation. */
export async function getCachedGroupFixtures(
  slug: string,
  competitionId: string,
  stage: string,
  groupCode: string,
): Promise<{ id: string; home_team: string; away_team: string }[]> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag(leagueTag(slug));
  const { data } = await createPublicSupabaseClient(slug)
    .from("matches")
    .select("id, home_team, away_team")
    .eq("competition_id", competitionId)
    .eq("stage", stage)
    .eq("group_code", groupCode);
  return data ?? [];
}
