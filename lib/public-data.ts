import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { type BracketResult, fetchBracket } from "@/lib/bracket";
import { CATALOG_TAG, leagueTag, NEWS_TAG } from "@/lib/cache-tags";
import {
  fetchCatalogLeagues,
  fetchLeagueBySlug,
  type LeagueCatalogEntry,
  type ResolvedCompetition,
} from "@/lib/competition";
import { groupStageKey, leagueStageKey } from "@/lib/competition-schema";
import type { NewsArticleRow } from "@/lib/db";
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
