import "server-only";
import {
  listLiveLeagues,
  getLeagueBySlug,
  getBrandingForLeague,
  getActiveBranding,
  resolveBranding,
  type ResolvedBranding,
} from "@/lib/competition";

// The context one cron pass runs against: the league's slug (sent as the
// `x-league` header so the DB layer scopes to it), its competition id (for
// callers that scope a query explicitly, e.g. runSync/syncLiveEvents), and its
// resolved branding (email sender name, news query). During the transition —
// before any league is flipped live — `slug`/`competitionId` are undefined and
// `branding` is the single-active fallback, so an unscoped pass reproduces the
// pre-concurrent behavior exactly.
export type LeagueRunContext = {
  slug?: string;
  competitionId?: string;
  branding: ResolvedBranding;
};

// Runs `fn` once per live league, scoping each pass to that league. When no
// league is live yet, runs `fn` once unscoped (single-active fallback) so cron
// behavior is unchanged until `set_league_live()` flips the launch leagues.
// Returns every pass's result plus how many live leagues were processed (0 for
// the fallback), which each cron folds into its summary log.
export async function forEachLiveLeague<T>(
  fn: (ctx: LeagueRunContext) => Promise<T>,
): Promise<{ results: T[]; leaguesProcessed: number }> {
  // Resolving the live leagues reads public competitions through the request
  // (cookie) client. Real cron invocations run inside a request scope so this
  // succeeds; if it can't (no request scope, or a read failure) we degrade to a
  // single unscoped run rather than aborting the whole cron.
  let leagues: Awaited<ReturnType<typeof listLiveLeagues>> = [];
  try {
    leagues = await listLiveLeagues();
  } catch (err) {
    console.warn(
      "[cron] live-league resolution failed; falling back to a single unscoped run",
      err,
    );
  }

  if (leagues.length === 0) {
    let branding: ResolvedBranding;
    try {
      branding = await getActiveBranding();
    } catch {
      branding = resolveBranding(null);
    }
    return { results: [await fn({ branding })], leaguesProcessed: 0 };
  }

  const results: T[] = [];
  for (const league of leagues) {
    const comp = await getLeagueBySlug(league.slug);
    results.push(
      await fn({
        slug: league.slug,
        competitionId: league.id,
        branding: getBrandingForLeague(comp),
      }),
    );
  }
  return { results, leaguesProcessed: leagues.length };
}

// Folds the common `{ emailed, failed, skipped }` dispatch summary across the
// per-league passes. Extra fields (e.g. `senderMisconfigured`) are intentionally
// dropped from the aggregate — the per-league logs carry them.
export function sumDispatch(
  list: { emailed: number; failed: number; skipped: number }[],
): { emailed: number; failed: number; skipped: number } {
  return list.reduce(
    (a, s) => ({
      emailed: a.emailed + s.emailed,
      failed: a.failed + s.failed,
      skipped: a.skipped + s.skipped,
    }),
    { emailed: 0, failed: 0, skipped: 0 },
  );
}
