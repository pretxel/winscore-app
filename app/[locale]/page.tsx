import { ArrowRightIcon, BrainIcon, NewspaperIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LeagueLane } from "@/components/league-lane";
import { Logotype } from "@/components/logotype";
import { ScoringExplainer } from "@/components/scoring-explainer";
import { TournamentCountdown } from "@/components/tournament-countdown";
import { buttonVariants } from "@/components/ui/button";
import { listMyPoolsByLeague } from "@/lib/groups";
import { getLeagueLaneFixtures } from "@/lib/home";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: t("title"), description: t("description") };
}

type T = Awaited<ReturnType<typeof getTranslations<"home">>>;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in visitors get the cross-league home: one lane per league they hold a
  // group in, with that league's live/next fixtures. No groups yet → an empty
  // state pointing at create + the catalog. Anonymous visitors see the static
  // marketing landing unchanged, preserving the public page's SEO/perf.
  if (user) {
    const leagues = await listMyPoolsByLeague();
    if (leagues.length > 0) {
      const lanes = await Promise.all(
        leagues.map(async (lane) => ({
          lane,
          fixtures: await getLeagueLaneFixtures(lane.slug),
        })),
      );
      return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.24em] uppercase">
              {t("lanesEyebrow")}
            </p>
            <Link
              href={localePath(locale, "/groups")}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {t("joinByCode")}
            </Link>
          </div>
          <div className="grid gap-4">
            {lanes.map(({ lane, fixtures }) => (
              <LeagueLane
                key={lane.competitionId}
                lane={lane}
                fixtures={fixtures}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        </main>
      );
    }
    return <EmptyGroupsHome locale={locale} t={t} />;
  }

  return (
    <main className="landing-blue">
      <Hero locale={locale} t={t} />
      <TournamentCountdown />
      <ScoringExplainer locale={locale} />
      <Cadence t={t} />
      <FeatureSections locale={locale} t={t} />
    </main>
  );
}

// Signed-in, but not in any group yet: point at group creation and the league
// catalog. Uses the same matchday-board type scale as the lanes home.
function EmptyGroupsHome({ locale, t }: { locale: Locale; t: T }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {t("emptyTitle")}
      </h1>
      <p className="text-muted-foreground mt-4 max-w-md">{t("emptyLede")}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href={localePath(locale, "/groups")} className={cn(buttonVariants({ size: "lg" }))}>
          {t("startGroup")}
        </Link>
        <Link
          href={localePath(locale, "/catalog")}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          {t("browseLeagues")}
          <ArrowRightIcon className="ml-1 size-4" />
        </Link>
        <Link
          href={localePath(locale, "/groups")}
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
        >
          {t("joinByCode")}
        </Link>
      </div>
    </main>
  );
}

function Hero({ locale, t }: { locale: Locale; t: T }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/70">
      <div
        aria-hidden
        className="bg-pitch-stripes absolute -right-32 -top-24 h-[42rem] w-[42rem] -rotate-12 opacity-[0.08] dark:opacity-[0.18]"
        style={{
          maskImage: "radial-gradient(closest-side at 50% 50%, black 35%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(closest-side at 50% 50%, black 35%, transparent 75%)",
        }}
      />
      <div className="bg-grain pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 lg:grid-cols-[1.6fr_1fr] lg:items-end">
        <div className="rise" style={{ animationDelay: "0ms" }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
            <span aria-hidden className="size-1.5 rounded-full bg-flag" />
            {t("eyebrow")}
            <span className="text-muted-foreground/40">·</span>
            {t("hostsLine")}
          </div>

          <div className="mt-4">
            <Logotype size="xl" className="text-foreground" ariaLabel="Winscore" />
          </div>
          <h1
            className="mt-6 font-heading text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.03em] text-foreground sm:text-6xl lg:text-[5rem]"
            style={{ fontStretch: "condensed" }}
          >
            <span className="block">{t("headlineLine1")}</span>
            <span className="block text-pitch">{t("headlineLine2")}</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("lede")}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={localePath(locale, "/sign-in")}
              className={buttonVariants({
                size: "lg",
                className: "h-11 gap-2 px-5 text-sm font-semibold uppercase tracking-[0.16em]",
              })}
            >
              {t("ctaSignIn")}
              <ArrowRightIcon />
            </Link>
            <Link
              href={localePath(locale, "/matches")}
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className: "h-11 px-5 text-sm font-medium",
              })}
            >
              {t("ctaBrowse")}
            </Link>
          </div>
        </div>

        <div
          className="rise relative overflow-hidden rounded-2xl ring-1 ring-border bg-card shadow-[0_24px_60px_-24px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)]"
          style={{ animationDelay: "120ms" }}
        >
          <img
            src="/leagues-world.jpeg"
            alt="Football leagues around the world"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}

function Cadence({ t }: { t: T }) {
  const items: Array<{
    tag: string;
    labelKey: "cadencePickLabel" | "cadenceLockLabel" | "cadenceScoreLabel" | "cadenceClimbLabel";
    copyKey: "cadencePickCopy" | "cadenceLockCopy" | "cadenceScoreCopy" | "cadenceClimbCopy";
  }> = [
    { tag: "01", labelKey: "cadencePickLabel", copyKey: "cadencePickCopy" },
    { tag: "02", labelKey: "cadenceLockLabel", copyKey: "cadenceLockCopy" },
    { tag: "03", labelKey: "cadenceScoreLabel", copyKey: "cadenceScoreCopy" },
    { tag: "04", labelKey: "cadenceClimbLabel", copyKey: "cadenceClimbCopy" },
  ];

  return (
    <section className="border-t border-border/70 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {t("cadenceEyebrow")}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {t("cadenceTrail")}
          </p>
        </div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((step) => (
            <li key={step.tag} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  {step.tag}
                </span>
                <span className="h-px flex-1 bg-border" />
                <span className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-pitch">
                  {t(step.labelKey)}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t(step.copyKey)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FeatureSections({ locale, t }: { locale: Locale; t: T }) {
  const features: Array<{
    titleKey: "groupsTitle" | "newsTitle" | "quizTitle";
    copyKey: "groupsCopy" | "newsCopy" | "quizCopy";
    ctaKey: "groupsCta" | "newsCta" | "quizCta";
    href: string;
    Icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      titleKey: "groupsTitle",
      copyKey: "groupsCopy",
      ctaKey: "groupsCta",
      href: "/groups",
      Icon: UsersIcon,
    },
    {
      titleKey: "newsTitle",
      copyKey: "newsCopy",
      ctaKey: "newsCta",
      href: "/news",
      Icon: NewspaperIcon,
    },
    {
      titleKey: "quizTitle",
      copyKey: "quizCopy",
      ctaKey: "quizCta",
      href: "/quiz",
      Icon: BrainIcon,
    },
  ];

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {t("featuresEyebrow")}
        </p>
        <h2
          className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ fontStretch: "condensed" }}
        >
          {t("featuresHeadline")}
        </h2>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <li
            key={f.href}
            className="group flex flex-col rounded-xl bg-card p-5 ring-1 ring-border transition-shadow hover:shadow-lg"
          >
            <div className="grid size-9 place-items-center rounded-md bg-pitch text-pitch-foreground">
              <f.Icon className="size-4" />
            </div>
            <h3 className="mt-5 font-heading text-lg font-semibold tracking-tight">
              {t(f.titleKey)}
            </h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{t(f.copyKey)}</p>
            <Link
              href={localePath(locale, f.href)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:text-pitch hover:underline"
            >
              {t(f.ctaKey)} <ArrowRightIcon className="size-3.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
