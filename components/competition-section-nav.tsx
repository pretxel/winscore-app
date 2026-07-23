import { getTranslations } from "next-intl/server";
import { NavLinks } from "@/components/site-nav-client";
import type { ResolvedCompetition } from "@/lib/competition";
import { hasGroupStage, leagueStageKey } from "@/lib/competition-schema";
import { type Locale, localePath } from "@/lib/i18n";

// Persistent, competition-scoped section nav rendered from `[league]/layout.tsx`,
// so it appears on every page beneath a competition. It only builds the link set
// (server): the active-state highlighting + `aria-current` live in the shared
// `NavLinks` client piece, reusing the same `isActive` prefix rule as the site
// nav so nested routes (e.g. `matches/[id]`) keep their parent section active.
//
// Matches/Leaderboard/Quiz always show; Standings and Bracket are gated by the
// competition format so a tab never dead-ends on an empty/redirecting page. When
// the competition (or its format) can't be resolved, only the core sections show.
export async function CompetitionSectionNav({
  locale,
  league,
  competition,
}: {
  locale: Locale;
  league: string;
  competition: ResolvedCompetition | null;
}) {
  const t = await getTranslations("nav");
  const format = competition?.format ?? null;
  const showStandings = format ? hasGroupStage(format) || leagueStageKey(format) !== null : false;
  const showBracket = format ? format.stages.some((s) => s.kind === "knockout") : false;

  const links = [
    { href: localePath(locale, `/${league}/matches`), label: t("matches") },
    ...(showStandings
      ? [{ href: localePath(locale, `/${league}/standings`), label: t("standings") }]
      : []),
    { href: localePath(locale, `/${league}/leaderboard`), label: t("leaderboard") },
    { href: localePath(locale, `/${league}/quiz`), label: t("quiz") },
    ...(showBracket
      ? [{ href: localePath(locale, `/${league}/bracket`), label: t("bracket") }]
      : []),
  ];

  return (
    <nav
      aria-label={t("sections")}
      className="border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      {/* overflow-x-auto + w-max: on narrow viewports the tab row scrolls
          horizontally instead of clipping or dropping sections. */}
      <div className="mx-auto max-w-6xl overflow-x-auto px-4">
        <NavLinks links={links} className="flex w-max py-2" />
      </div>
    </nav>
  );
}
