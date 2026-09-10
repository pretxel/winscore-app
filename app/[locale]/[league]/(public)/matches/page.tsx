import { CheckCircle2Icon, ChevronRightIcon, MapPinIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { LocalTime } from "@/components/local-time";
import { MatchDaySection } from "@/components/match-day-section";
import { MatchLockCountdown } from "@/components/match-lock-countdown";
import { MatchRoundFilter } from "@/components/match-round-filter";
import { MatchStateBadge } from "@/components/match-state-badge";
import { MatchStatusFilter } from "@/components/match-status-filter";
import { NeedsPickToggle } from "@/components/needs-pick-toggle";
import { PendingPicksNudge } from "@/components/pending-picks-nudge";
import { TeamCrest } from "@/components/team-crest";
import { TimezoneSync } from "@/components/timezone-sync";
import { getLeagueFromContext } from "@/lib/competition";
import { getStageLabel, revealedKnockoutStageKeys, sortedStages } from "@/lib/competition-schema";
import type { MatchRow } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import {
  DEFAULT_DAY_WINDOW_MATCHES,
  dayKeyForTimeZone,
  formatDayKeyLabel,
  isClosingSoon,
  isConfirmedMatch,
  isLocked,
  needsPick,
  parseDaysParam,
  parsePicksParam,
  parseRoundParam,
  parseStatusParam,
  soonestPickableMatch,
  stagesPresent,
  statusBucket,
  windowDayEntries,
} from "@/lib/match-utils";
import { maybeScheduleOpportunisticSync } from "@/lib/result-sync/opportunistic";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { persistTimeZoneForCurrentUser, readTimeZoneCookie } from "@/lib/timezone";
import { cn } from "@/lib/utils";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const ROW_STAGGER_MS = 20;
const ROW_STAGGER_CAP_MS = 800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; league: string }>;
}): Promise<Metadata> {
  const { locale, league } = await params;
  const t = await getTranslations({ locale, namespace: "matches" });
  const comp = await getLeagueFromContext({ slug: league });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const leagueName = comp?.name ?? tCommon("thisLeague");
  return {
    title: comp ? `${t("title")} · ${comp.short_name}` : t("title"),
    description: t("description", { league: leagueName }),
    alternates: { canonical: `/${league}/matches` },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription", { league: leagueName }),
      url: `/${league}/matches`,
      type: "website",
    },
  };
}

type MatchUiStatus = "scheduled" | "locked" | "live" | "final" | "cancelled";

function uiStatusFor(m: MatchRow): MatchUiStatus {
  if (m.status === "live") return "live";
  if (m.status === "final") return "final";
  if (m.status === "cancelled") return "cancelled";
  return isLocked(m) ? "locked" : "scheduled";
}

export default async function MatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; league: string }>;
  searchParams: Promise<{
    status?: string | string[];
    picks?: string | string[];
    round?: string | string[];
    days?: string | string[];
  }>;
}) {
  const { locale: raw, league } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);

  const {
    status: statusParam,
    picks: picksParam,
    round: roundParam,
    days: daysParam,
  } = await searchParams;

  // These four are independent, so they overlap rather than queue up.
  // League-scoped client: the x-league header resolves active_competition_id()
  // so every competition-scoped read below targets this route's league.
  const [t, activeCompetition, supabase, timeZone] = await Promise.all([
    getTranslations("matches"),
    getLeagueFromContext({ slug: league }),
    createServerSupabaseClient(league),
    readTimeZoneCookie(),
  ]);
  const format = activeCompetition?.format ?? null;

  // Explicit column list rather than `*`: a season's fixture list is hundreds
  // of rows, and the audit/provider columns the page never reads are pure
  // transfer cost between Postgres and the render.
  // The fixture list and the viewer are independent, so they resolve together
  // rather than one after the other.
  const [matchesRes, userRes] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, stage, group_code, home_team, away_team, kickoff_at, venue, home_score, away_score, status, competition_id, round_id, tie_key, leg",
      )
      .eq("competition_id", activeCompetition?.id ?? "")
      .order("kickoff_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);
  const { data: matches, error } = matchesRes;
  const user = userRes.data.user;

  if (error) {
    // Log the raw cause server-side for diagnostics; never surface exception
    // text to the user (WCAG-friendly, trust-preserving error state).
    console.error("[matches] load failed:", error.message);
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div
          role="alert"
          className="border-border bg-card mx-auto max-w-md rounded-xl border p-6 text-center"
        >
          <h1 className="text-foreground text-lg font-semibold">{t("loadFailedTitle")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{t("loadFailedBody")}</p>
          <a
            href={localePath(locale, `/${league}/matches`)}
            className="bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background mt-5 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t("loadFailedRetry")}
          </a>
        </div>
      </main>
    );
  }

  // Public visibility: a fixture shows when it is confirmed (both teams real)
  // OR its knockout round has been revealed by an admin. Revealed rounds let
  // players see the upcoming schedule (date/venue/placeholders) before teams
  // are confirmed; such rows render read-only and stay unpickable (the pick
  // gate is still confirmation). Everything below (filter, stats, day groups)
  // operates on this visible base.
  const revealedStages = format ? revealedKnockoutStageKeys(format) : new Set<string>();
  const list = ((matches ?? []) as MatchRow[]).filter(
    (m) => isConfirmedMatch(m) || revealedStages.has(m.stage),
  );

  // Safety net for the daily cron: if a kicked-off match still has no result
  // hours later, run a result sync after this response is sent. Costs the
  // render an in-memory scan only; debounced inside.
  maybeScheduleOpportunisticSync(list);

  // Only signed-in requests pay for the per-user pick lookup; anonymous
  // visitors get the list unchanged. RLS (predictions_select_own) scopes the
  // read to the current user.
  let pickedIds = new Set<string>();
  if (user) {
    const { data: picks } = await supabase
      .from("predictions")
      .select("match_id")
      .eq("user_id", user.id);
    pickedIds = new Set((picks ?? []).map((p) => p.match_id));
  }

  // Ephemeral URL-driven filters, applied confirmed → round → status → picks.
  // Unknown param values are dropped so a bad URL falls back to "show
  // everything" rather than erroring.

  // Round (stage) filter options: the rounds present in the visible list, in the
  // competition format's stage order, labeled with localized stage names. A
  // `?round=` value not among them falls back to "All rounds".
  const present = stagesPresent(list);
  const roundOptions = format
    ? sortedStages(format)
        .filter((s) => present.has(s.key))
        .map((s) => ({ key: s.key, label: getStageLabel(format, s.key, locale) }))
    : [];
  const parsedRound = parseRoundParam(roundParam);
  const selectedRound = parsedRound && present.has(parsedRound) ? parsedRound : null;

  // The round filter feeds the "scoped" set for header stats and needs-pick count.
  const scoped = selectedRound ? list.filter((m) => m.stage === selectedRound) : list;

  // Stats and the needs-pick count come from the scoped (round-filtered) set
  // BEFORE the status/picks filters, so each control shows what activating it
  // would yield (clicking "Live · 3" can never produce an empty list).
  const stats = {
    upcoming: scoped.filter((m) => statusBucket(m) === "upcoming").length,
    live: scoped.filter((m) => statusBucket(m) === "live").length,
    final: scoped.filter((m) => statusBucket(m) === "final").length,
  };

  const statusFilter = parseStatusParam(statusParam);
  // Default (no status filter): every fixture, played ones included. The list is
  // a season calendar, so hiding results made it impossible to look back at a
  // matchday from the page that lists it. The window below opens on today, so
  // the played fixtures sit above the fold rather than in front of it.
  const statusFiltered = statusFilter
    ? scoped.filter((m) => statusBucket(m) === statusFilter)
    : scoped;

  // The picks filter exists only for signed-in users; an anonymous request
  // carrying `?picks=needed` is silently ignored.
  const picksNeeded = user != null && parsePicksParam(picksParam);
  const needsPickCount = user ? scoped.filter((m) => needsPick(m, pickedIds)).length : 0;
  const filtered = picksNeeded
    ? statusFiltered.filter((m) => needsPick(m, pickedIds))
    : statusFiltered;

  const isFiltered = statusFilter !== null || picksNeeded || selectedRound !== null;

  // The default view now includes finished fixtures, so it can only be empty
  // when the league has no fixtures at all.
  const allFinishedDefault = false;

  // First-pick lead state (QW8): a signed-in user who has made zero picks and
  // has no filter active gets an inviting nudge toward the soonest still-open
  // fixture. It sits above the list (additive, never a takeover). When nothing
  // is currently pickable we fall back to encouraging copy instead of a CTA.
  const showFirstPick = user != null && pickedIds.size === 0 && !isFiltered;
  const firstPickMatch = showFirstPick ? soonestPickableMatch(list, pickedIds) : null;

  // Group by the visitor's local calendar day so each match sits under the day
  // its displayed local kickoff falls on. The timezone comes from the `tz`
  // cookie (set client-side by <TimezoneSync/>); until it's known we key by UTC
  // for a deterministic first render. Source order is kickoff_at ASC, so the
  // Map's insertion order keeps the day sections chronological.
  // Best-effort: mirror the detected zone onto the signed-in user's profile so
  // the reminder crons can bucket them to ~7am local. It is a read plus a write
  // that nothing on this page depends on, so it runs after the response is
  // sent rather than in front of it.
  if (user) after(() => persistTimeZoneForCurrentUser(timeZone));
  const dayKey = dayKeyForTimeZone(timeZone);
  const byDay = new Map<string, MatchRow[]>();
  for (const m of filtered) {
    const key = dayKey(m.kickoff_at);
    const arr = byDay.get(key) ?? [];
    arr.push(m);
    byDay.set(key, arr);
  }

  // Render a leading window of whole days by default; `?days=all` opts into the
  // rest. Filters and counts above still span every fixture, so this only
  // bounds how much markup one response carries.
  const daysView = parseDaysParam(daysParam);
  const allDayEntries = [...byDay.entries()];
  // Anchored on the visitor's today, so the page opens on the current matchday
  // with the last week of results above it, not on the season's opening day.
  const windowed = windowDayEntries(
    allDayEntries,
    DEFAULT_DAY_WINDOW_MATCHES,
    dayKey(new Date().toISOString()),
  );
  const dayEntries = daysView === "all" ? allDayEntries : windowed.entries;
  const hiddenMatches = daysView === "all" ? 0 : windowed.hiddenMatches;
  const hiddenBefore = daysView === "all" ? 0 : windowed.hiddenBefore;
  const showAllHref = `${localePath(locale, `/${league}/matches`)}?${new URLSearchParams({
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(selectedRound ? { round: selectedRound } : {}),
    ...(picksNeeded ? { picks: "needed" } : {}),
    days: "all",
  }).toString()}`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <TimezoneSync />
      <header className="border-border mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.24em] uppercase">
            {t("eyebrow")}
          </p>
          <h1
            className="font-heading mt-1 text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ fontStretch: "condensed" }}
          >
            {t("headline")}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            {t("lede", { total: filtered.length })}
          </p>
        </div>
        <Suspense fallback={null}>
          <MatchStatusFilter
            counts={stats}
            active={statusFilter}
            labels={{
              upcoming: t("statUpcoming"),
              live: t("statLive"),
              final: t("statFinal"),
            }}
            groupLabel={t("filterStatusLabel")}
          />
        </Suspense>
      </header>

      {user != null && needsPickCount > 0 && !picksNeeded ? (
        <div className="mb-4">
          <Suspense fallback={null}>
            <PendingPicksNudge
              count={needsPickCount}
              message={t("pendingPicksNudge", { count: needsPickCount })}
              actionLabel={t("pendingPicksNudgeAction")}
              dismissLabel={t("pendingPicksNudgeDismiss")}
            />
          </Suspense>
        </div>
      ) : null}

      {user ? (
        <div className="mb-4">
          <Suspense fallback={null}>
            <NeedsPickToggle
              count={needsPickCount}
              active={picksNeeded}
              label={t("filterNeedsPick")}
            />
          </Suspense>
        </div>
      ) : null}

      {roundOptions.length > 1 ? (
        <Suspense fallback={null}>
          <MatchRoundFilter
            rounds={roundOptions}
            selected={selectedRound}
            allLabel={t("filterAllRounds")}
            label={t("filterRoundLabel")}
          />
        </Suspense>
      ) : null}

      {showFirstPick ? (
        <div className="border-border bg-muted/30 mb-8 rounded-xl border border-dashed p-6 text-center sm:p-8">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.24em] uppercase">
            {t("firstPick.eyebrow")}
          </p>
          {firstPickMatch ? (
            <>
              <p className="font-heading mx-auto mt-2 max-w-sm text-2xl font-semibold tracking-tight">
                {t("firstPick.title")}
              </p>
              <Link
                href={localePath(locale, `/${league}/matches/${firstPickMatch.id}`)}
                className="border-border bg-card font-heading text-foreground hover:bg-muted/50 focus-visible:ring-ring mt-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium tracking-tight transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {t("firstPick.cta", {
                  home: firstPickMatch.home_team,
                  away: firstPickMatch.away_team,
                })}
                <ChevronRightIcon className="size-4" aria-hidden />
              </Link>
            </>
          ) : (
            <>
              <p className="font-heading mx-auto mt-2 max-w-sm text-2xl font-semibold tracking-tight">
                {t("firstPick.noneTitle")}
              </p>
              <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
                {t("firstPick.noneBody")}
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="space-y-12">
        {hiddenBefore > 0 ? (
          <div className="text-center">
            <Link
              href={showAllHref}
              className="border-border bg-card font-heading text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring inline-flex min-h-10 items-center rounded-full border px-5 text-sm font-medium tracking-tight transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {t("showEarlier", { count: hiddenBefore })}
            </Link>
          </div>
        ) : null}
        {dayEntries.map(([day, dayMatches], idx) => {
          // Every day opens by default, played ones included: the list is a
          // season calendar, and a collapsed matchday is a hidden result. The
          // section stays collapsible, and the client shell still restores the
          // visitor's own per-day choice after mount.
          return (
            <MatchDaySection
              key={day}
              dayKey={day}
              defaultOpen
              matchday={t("matchday", { n: String(idx + 1).padStart(2, "0") })}
              dateNode={formatDayKeyLabel(day, locale)}
              countLabel={t("matchCount", { count: dayMatches.length })}
              expandLabel={t("dayExpand")}
              collapseLabel={t("dayCollapse")}
            >
              <ul className="border-border bg-card overflow-hidden rounded-xl border">
                {dayMatches.map((m, i) => {
                  const delay = Math.min(i * ROW_STAGGER_MS, ROW_STAGGER_CAP_MS);
                  return (
                    <li
                      key={m.id}
                      className={cn(
                        i !== 0 && "border-border border-t",
                        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both motion-safe:duration-300",
                      )}
                      style={{ animationDelay: `${delay}ms` }}
                    >
                      <MatchRowCard
                        match={m}
                        uiStatus={uiStatusFor(m)}
                        locale={locale}
                        league={league}
                        tStage={format ? getStageLabel(format, m.stage, locale) : m.stage}
                        tKickoff={t("rowKickoff")}
                        tFinal={t("rowFinal")}
                        tOnNow={t("rowOnNow")}
                        tLocked={t("rowLocked")}
                        tPick={t("rowPick")}
                        tClosesIn={t("rowClosesIn", { time: "{time}" })}
                        picked={pickedIds.has(m.id)}
                        tPicked={t("rowPicked")}
                        confirmed={isConfirmedMatch(m)}
                        tTbd={t("rowTeamsTbd")}
                      />
                    </li>
                  );
                })}
              </ul>
            </MatchDaySection>
          );
        })}

        {hiddenMatches > 0 ? (
          <div className="text-center">
            <Link
              href={showAllHref}
              className="border-border bg-card font-heading text-foreground hover:bg-muted/50 focus-visible:ring-ring inline-flex min-h-10 items-center rounded-full border px-5 text-sm font-medium tracking-tight transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {t("showAllRemaining", { count: hiddenMatches })}
            </Link>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="border-border bg-muted/30 rounded-xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.24em] uppercase">
              {picksNeeded
                ? t("needsPickEmptyTitle")
                : isFiltered
                  ? t("filterEmptyTitle")
                  : allFinishedDefault
                    ? t("allFinishedTitle")
                    : t("emptyTitle")}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm">
              {picksNeeded
                ? t("needsPickEmptyBody")
                : isFiltered
                  ? t("filterEmptyBody")
                  : allFinishedDefault
                    ? t("allFinishedBody")
                    : t("emptyBody")}
            </p>
            {isFiltered || allFinishedDefault ? (
              <Link
                href={localePath(locale, allFinishedDefault ? "/matches?status=final" : "/matches")}
                className="border-border bg-card font-heading text-foreground hover:bg-muted/50 focus-visible:ring-ring mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-tight transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {picksNeeded
                  ? t("needsPickEmptyAction")
                  : allFinishedDefault
                    ? t("allFinishedAction")
                    : t("filterClear")}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function MatchRowCard({
  match,
  uiStatus,
  locale,
  league,
  tStage,
  tKickoff,
  tFinal,
  tOnNow,
  tLocked,
  tPick,
  tClosesIn,
  picked,
  tPicked,
  confirmed,
  tTbd,
}: {
  match: MatchRow;
  uiStatus: MatchUiStatus;
  locale: Locale;
  league: string;
  tStage: string;
  tKickoff: string;
  tFinal: string;
  tOnNow: string;
  tLocked: string;
  tPick: string;
  tClosesIn: string;
  picked: boolean;
  tPicked: string;
  confirmed: boolean;
  tTbd: string;
}) {
  const finalKnown =
    match.status === "final" && match.home_score != null && match.away_score != null;

  // A scheduled, unpicked fixture becomes a "closing soon" candidate. Only a
  // confirmed fixture is pickable — a revealed-but-unconfirmed knockout row is
  // read-only (schedule only), so it never shows the Pick/closing-soon affordance.
  const pickable = uiStatus === "scheduled" && !picked && confirmed;
  const closingSoon = pickable && isClosingSoon(match.kickoff_at);

  // Accessible name for the whole-row link: lead with the action when the match
  // is pickable so screen-reader users hear "Pick: Algeria – Austria", otherwise
  // a plain "view" name. Keeps the link's name concise vs. its inner text.
  const rowAriaLabel = pickable
    ? `${tPick}: ${match.home_team} – ${match.away_team}`
    : `${match.home_team} – ${match.away_team}`;

  return (
    <Link
      href={localePath(locale, `/${league}/matches/${match.id}`)}
      aria-label={rowAriaLabel}
      className={cn(
        "group/match hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-inset relative flex items-center gap-3 px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:gap-4 sm:px-5",
        // Subtle urgency accent, distinct from the live `live-pulse` and the
        // muted locked treatment: a warm inset ring + faint tint.
        closingSoon && "bg-flag/[0.06] ring-flag/30 ring-1 ring-inset",
      )}
    >
      <div className="flex w-auto shrink-0 flex-col items-start sm:w-14">
        <span className="text-muted-foreground hidden font-mono text-[10px] tracking-[0.18em] uppercase sm:block">
          {tKickoff}
        </span>
        <span className="text-foreground font-mono text-sm font-semibold tabular-nums">
          <LocalTime iso={match.kickoff_at} format="time" />
        </span>
      </div>
      <div aria-hidden className="bg-border hidden h-10 w-px sm:block" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="border-border bg-secondary text-muted-foreground rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase">
            {tStage}
            {match.group_code ? ` · ${match.group_code}` : ""}
          </span>
          <MatchStateBadge status={uiStatus} size="sm" />
          {picked ? (
            <span className="border-pitch/40 bg-pitch/10 text-pitch inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.16em] uppercase">
              <CheckCircle2Icon className="size-3" aria-hidden />
              {tPicked}
            </span>
          ) : null}
        </div>
        <div className="font-heading text-foreground mt-1.5 flex min-w-0 flex-col gap-1 text-base font-semibold tracking-tight sm:flex-row sm:items-center sm:gap-2 sm:text-lg">
          <span className="flex min-w-0 items-center gap-2">
            <TeamCrest team={match.home_team} />
            <span className="truncate">{match.home_team}</span>
          </span>
          <span className="text-muted-foreground hidden text-xs font-medium tracking-[0.18em] uppercase sm:inline">
            vs
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <TeamCrest team={match.away_team} />
            <span className="truncate">{match.away_team}</span>
          </span>
        </div>
        {match.venue ? (
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
            <MapPinIcon className="size-3" aria-hidden />
            <span className="truncate">{match.venue}</span>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-right">
        {!confirmed ? (
          <div className="text-muted-foreground hidden font-mono text-[10px] tracking-[0.2em] uppercase sm:block">
            {tTbd}
          </div>
        ) : finalKnown ? (
          <div>
            <div className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
              {tFinal}
            </div>
            <div className="text-foreground font-mono text-xl font-semibold tabular-nums">
              {match.home_score}–{match.away_score}
            </div>
          </div>
        ) : uiStatus === "live" ? (
          <div className="text-destructive live-pulse hidden font-mono text-[10px] tracking-[0.2em] uppercase sm:block">
            {tOnNow}
          </div>
        ) : uiStatus === "locked" ? (
          <div className="text-muted-foreground hidden font-mono text-[10px] tracking-[0.2em] uppercase sm:block">
            {tLocked}
          </div>
        ) : pickable ? (
          // Open & unpicked: one client island owns the trailing affordance. It
          // shows the static "Pick" label until kickoff is within the lead
          // window, the "closes in mm:ss" badge while imminent, and the locked
          // label at kickoff — updating in place as the clock crosses each
          // boundary, no reload.
          <MatchLockCountdown
            kickoffAt={match.kickoff_at}
            closesInTemplate={tClosesIn}
            lockedNode={
              <span className="text-muted-foreground hidden font-mono text-[10px] tracking-[0.2em] uppercase sm:inline">
                {tLocked}
              </span>
            }
            pickNode={
              <span className="bg-pitch text-pitch-foreground inline-flex items-center rounded-full px-3 py-1.5 font-heading text-xs font-semibold tracking-tight">
                {tPick}
              </span>
            }
          />
        ) : (
          <div className="text-muted-foreground hidden font-mono text-[10px] tracking-[0.2em] uppercase sm:block">
            {tPick}
          </div>
        )}
        <ChevronRightIcon
          aria-hidden
          className="text-muted-foreground/60 group-hover/match:text-foreground size-4 shrink-0 transition-transform group-hover/match:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
