// Cache tag vocabulary, in one place.
//
// Cached readers tag what they derive from; writers invalidate the same tags
// after committing. Both sides import from here so a rename can never leave a
// write invalidating a tag no reader uses — the failure mode is silent stale
// content, which is expensive to notice.
//
// Two families cover everything shared:
//   league:<slug>  anything derived from a league's fixtures, results, or
//                  standings — the catalog card, tables, bracket, leaderboard,
//                  phase boards, and fixture list.
//   match:<id>     anything derived from one match — its header, events, AI
//                  recap, and comic render.
// Plus two fixed tags for content that belongs to no league.

export function leagueTag(slug: string): string {
  return `league:${slug}`;
}

export function matchTag(matchId: string): string {
  return `match:${matchId}`;
}

/** The league catalog and the rulebook: competition-level edits, no league scope. */
export const CATALOG_TAG = "catalog";

/** The news feed, refreshed by its own cron. */
export const NEWS_TAG = "news";
