import { type NextRequest, NextResponse } from "next/server";
import { forEachLiveLeague } from "@/lib/cron/for-each-league";
import { env } from "@/lib/env";
import { runNewsSync } from "@/lib/news-sync";
import { recordRun } from "@/lib/operations/record-run";
import { isOperationEnabled } from "@/lib/operations/settings";

function unauthorized() {
  return new NextResponse("unauthorized", { status: 401 });
}

function skipped(reason: string) {
  return new NextResponse(null, {
    status: 204,
    headers: { "x-skipped": reason },
  });
}

export async function GET(request: NextRequest) {
  // 1. Auth: require Bearer ${CRON_SECRET}. In non-prod with no secret, allow.
  const auth = request.headers.get("authorization");
  const isProd = process.env.NODE_ENV === "production";
  if (env.cronSecret) {
    if (auth !== `Bearer ${env.cronSecret}`) return unauthorized();
  } else if (isProd) {
    return skipped("missing-env");
  }

  // Admin kill switch (operation_settings): a paused job's cron invocation is
  // a cheap no-op. Manual "Run now" bypasses this by design.
  if (!(await isOperationEnabled("sync_news"))) return skipped("disabled");

  // 2. Token gate. Skip (not error) when the upstream token is absent.
  if (!env.newsApiToken) return skipped("missing-env");

  // 3. Sync + record, once per live league (each pass scoped to its league via
  //    the x-league header + its own news query). A thrown step (upstream fetch
  //    / existing-news load) is recorded (status='error') and RE-THROWN, so the
  //    route still 500s as before. Pre-cutover (no live league) it runs once
  //    unscoped. The recorded summary aggregates every pass.
  let leaguesProcessed = 0;
  const { summary } = await recordRun("sync_news", "cron", async () => {
    const { results, leaguesProcessed: n } = await forEachLiveLeague((ctx) =>
      runNewsSync({ newsQuery: ctx.branding.newsQuery, leagueSlug: ctx.slug }),
    );
    leaguesProcessed = n;
    return results.reduce(
      (a, s) => ({
        fetched: a.fetched + s.fetched,
        inserted: a.inserted + s.inserted,
        updated: a.updated + s.updated,
        skipped: a.skipped + s.skipped,
        errors: a.errors + s.errors,
      }),
      { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
    );
  });

  const logged = { ...summary, leaguesProcessed };
  console.log(`[cron:sync-news] summary:`, JSON.stringify(logged));
  return NextResponse.json(logged);
}
