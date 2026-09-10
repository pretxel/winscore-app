import { ArrowRightIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FixturesStrip } from "@/components/fixtures-strip";
import { LeagueRail } from "@/components/league-rail";
import { TeamCrestCluster } from "@/components/team-crest-cluster";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import { leagueMark } from "@/lib/league-marks";
import {
  getCachedCatalogLeagues,
  getCachedLaneFixtures,
  getCachedLeagueRoster,
} from "@/lib/public-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return {
    title: t("title"),
    description: t("lede"),
    alternates: { canonical: "/catalog" },
  };
}

// League catalog — the entry point to every live league and the redirect target
// for legacy single-competition paths / unknown league slugs. Each live league is
// a matchday-board card: its vertical nameplate rail in the league's own hue, the
// official emblem, who's playing (a cluster of team crests), what's on right now
// (live/next fixtures), and the two startable actions (browse fixtures, start a
// group). The substance is the sell: a card should look like a competition, not
// a menu item.
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");

  const leagues = await getCachedCatalogLeagues();
  const cards = await Promise.all(
    leagues.map(async (league) => {
      const [roster, fixtures] = await Promise.all([
        getCachedLeagueRoster(league.slug, league.id),
        getCachedLaneFixtures(league.slug, league.id),
      ]);
      return { league, roster, fixtures, mark: leagueMark(league.slug) };
    }),
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-xl">{t("lede")}</p>
      </header>

      {cards.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-xl border border-dashed px-6 py-12 text-center">
          {t("empty")}
        </p>
      ) : (
        <ul className="admin-reveal grid gap-4">
          {cards.map(({ league, roster, fixtures, mark }) => {
            const fixturesHref = localePath(locale, `/${league.slug}/matches`);
            return (
              <li key={league.id} className="min-w-0">
                <article className="border-border bg-card flex overflow-hidden rounded-xl border">
                  <LeagueRail label={league.shortName || league.name} hue={mark?.hue} />
                  <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        {mark ? (
                          <Link
                            href={fixturesHref}
                            aria-hidden
                            tabIndex={-1}
                            className="ring-border/60 flex size-16 shrink-0 items-center justify-center rounded-lg bg-white p-2 ring-1 sm:size-20"
                          >
                            <Image
                              src={mark.emblem}
                              alt=""
                              width={80}
                              height={80}
                              className="size-full object-contain"
                            />
                          </Link>
                        ) : null}
                        <div className="min-w-0">
                          <h2 className="font-heading text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
                            <Link href={fixturesHref} className="hover:underline">
                              {league.name}
                            </Link>
                          </h2>
                          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            {roster.matchCount > 0 ? (
                              <span className="tabular-nums">
                                {t("facts", {
                                  teams: roster.teams.length,
                                  matches: roster.matchCount,
                                })}
                              </span>
                            ) : null}
                            {roster.liveCount > 0 ? (
                              <span className="text-live live-pulse inline-flex items-center font-mono text-xs tracking-wider uppercase">
                                {t("liveNow", { count: roster.liveCount })}
                              </span>
                            ) : null}
                            {league.status === "upcoming" ? (
                              <Badge className="border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400">
                                {t("comingSoon")}
                              </Badge>
                            ) : null}
                            {league.status === "finished" ? (
                              <Badge
                                variant="outline"
                                className="border-muted-foreground/30 text-muted-foreground"
                              >
                                {t("finished")}
                              </Badge>
                            ) : null}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={fixturesHref}
                          className="border-border hover:bg-secondary inline-flex min-h-10 items-center gap-1 rounded-md border px-4 text-sm font-medium transition-colors"
                        >
                          {t("fixtures")}
                          <ArrowRightIcon className="size-4" />
                        </Link>
                        {league.status === "active" ? (
                          <Link
                            href={localePath(locale, "/groups")}
                            className="bg-primary text-primary-foreground inline-flex min-h-10 items-center gap-1 rounded-md px-4 text-sm font-semibold"
                          >
                            <PlusIcon className="size-4" />
                            {t("start")}
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    {roster.teams.length > 0 ? (
                      <TeamCrestCluster
                        teams={roster.teams}
                        overflowLabel={(count) => t("moreTeams", { count })}
                      />
                    ) : null}

                    {fixtures.length > 0 ? <FixturesStrip fixtures={fixtures} /> : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
