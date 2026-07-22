import Link from "next/link";
import { ArrowRightIcon, PlusIcon, UsersIcon } from "lucide-react";
import { LeagueRail } from "@/components/league-rail";
import { FixturesStrip } from "@/components/fixtures-strip";
import { getTranslations } from "next-intl/server";
import { localePath, type Locale } from "@/lib/i18n";
import type { LeaguePools } from "@/lib/groups";
import type { LaneFixture } from "@/lib/home";

// The `home` namespace translator, matching what the home page passes down.
type HomeT = Awaited<ReturnType<typeof getTranslations<"home">>>;

// One band of the cross-league home: the league's vertical nameplate rail, its
// name + entry links, the caller's groups in that league, and a compact strip of
// live/next fixtures. Live scores render as split-flap Scorelines; upcoming ones
// show the kickoff time. Purely presentational — data is fetched by the page.
export function LeagueLane({
  lane,
  fixtures,
  locale,
  t,
}: {
  lane: LeaguePools;
  fixtures: LaneFixture[];
  locale: Locale;
  t: HomeT;
}) {
  return (
    <section className="rise border-border bg-card overflow-hidden rounded-xl border">
      <div className="flex">
        <LeagueRail label={lane.shortName || lane.name} />
        <div className="flex-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-muted-foreground font-mono text-[11px] tracking-[0.24em] uppercase">
                {t("lanesEyebrow")}
              </p>
              <h2 className="font-heading text-foreground text-xl font-semibold tracking-tight">
                {lane.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={localePath(locale, `/${lane.slug}/matches`)}
                className="border-border hover:bg-secondary inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-xs font-medium transition-colors"
              >
                {t("allFixtures")}
                <ArrowRightIcon className="size-3.5" />
              </Link>
              <Link
                href={localePath(locale, "/groups")}
                className="bg-primary text-primary-foreground inline-flex min-h-9 items-center gap-1 rounded-md px-3 text-xs font-semibold"
              >
                <PlusIcon className="size-3.5" />
                {t("startGroup")}
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {lane.pools.map((pool) => (
              <Link
                key={pool.id}
                href={localePath(locale, `/groups/${pool.id}`)}
                className="border-border hover:bg-secondary flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors"
              >
                <span className="text-foreground truncate font-medium">
                  {pool.name}
                </span>
                <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-xs">
                  <UsersIcon className="size-3.5" />
                  {t("memberCount", { count: pool.memberCount })}
                </span>
              </Link>
            ))}
          </div>

          {fixtures.length > 0 ? (
            <div className="mt-4">
              <FixturesStrip fixtures={fixtures} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
