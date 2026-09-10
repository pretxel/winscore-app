import { ArrowLeftIcon, ArrowRightIcon, CrownIcon, TrophyIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FixturesStrip } from "@/components/fixtures-strip";
import { PhaseSeasonSummary } from "@/components/groups/phase-season-summary";
import { PhaseSwitcher } from "@/components/groups/phase-switcher";
import { RoundList } from "@/components/groups/round-list";
import { type BoardRow, LeaderboardTable } from "@/components/leaderboard-table";
import { LocalTime } from "@/components/local-time";
import { getLeagueForPool } from "@/lib/competition";
import { getGroup, getGroupBoard, getGroupPhaseBoard } from "@/lib/groups";
import { getRoundProgress, selectRoundWindow } from "@/lib/groups/round-progress";
import { getLeagueLaneFixtures } from "@/lib/home";
import { DEFAULT_LOCALE, isLocale, type Locale, localePath } from "@/lib/i18n";
import { listGroupPhaseWinners, listPhases, type Phase, type PhaseWinner } from "@/lib/phases";
import {
  DeleteGroupButton,
  InviteByEmail,
  InviteShare,
  LeaveGroupButton,
  RemoveMemberButton,
  RenameGroupForm,
} from "./group-controls";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const group = await getGroup(id);
  const t = await getTranslations({ locale, namespace: "groups" });
  return {
    title: group ? `${group.name} · ${t("title")}` : t("title"),
    robots: { index: false },
  };
}

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ phase?: string | string[] }>;
}) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  setRequestLocale(locale);
  const { phase: phaseParam } = await searchParams;

  const t = await getTranslations("groups");

  const group = await getGroup(id);
  if (!group) notFound();

  // Single-league focus: resolve the league this pool belongs to (even if it is
  // no longer live) and its live/next fixtures, so members jump straight to
  // predicting in the right league.
  const league = await getLeagueForPool(id);
  const fixtures = league ? await getLeagueLaneFixtures(league.slug, league.id) : [];

  // Phases exist only for a group that chose a scheme at creation. The
  // selected phase comes from `?phase=`; an unknown id falls back to all-time.
  const phases: Phase[] = group.phaseSchemeId ? await listPhases(group.phaseSchemeId, locale) : [];
  const requestedPhase = Array.isArray(phaseParam) ? phaseParam[0] : phaseParam;
  const selectedPhase = phases.find((p) => p.id === requestedPhase) ?? null;
  const activePhase = phases.find((p) => p.status === "active") ?? null;
  const closedPhases = phases.filter((p) => p.status === "closed");
  const winners: PhaseWinner[] =
    group.phaseSchemeId && group.currentUserId ? await listGroupPhaseWinners(id) : [];

  const board = selectedPhase
    ? await getGroupPhaseBoard(id, selectedPhase.id)
    : await getGroupBoard(id);
  const rows: BoardRow[] = board.rows;
  const lateJoiners = new Set(
    selectedPhase
      ? board.rows
          .filter((r) => "joined_mid_phase" in r && r.joined_mid_phase)
          .map((r) => r.user_id)
      : [],
  );
  const myRow = group.currentUserId
    ? rows.find((r) => r.user_id === group.currentUserId)
    : undefined;

  // Members only: someone who has not joined has no predictions to complete.
  // `getGroup` only populates currentUserId for a signed-in member, so this is
  // both the auth and the membership check. `league` can be null for a pool
  // whose competition was removed, and the round link needs its slug.
  const roundWindow =
    group.currentUserId && league
      ? selectRoundWindow(await getRoundProgress(id, group.currentUserId, locale))
      : null;

  const basePath = localePath(locale, `/groups/${id}`);
  const selectedWinners = selectedPhase
    ? winners.filter((w) => w.phaseId === selectedPhase.id)
    : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={localePath(locale, "/groups")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" /> {t("backToGroups")}
      </Link>

      <header className="mb-6 flex flex-col gap-2 border-b border-border pb-6">
        <div className="flex items-center gap-2">
          <h1
            className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontStretch: "condensed" }}
          >
            {group.name}
          </h1>
          {group.isOwner ? (
            <CrownIcon className="size-5 text-flag" aria-label={t("ownerLabel")} />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("memberCount", { count: group.members.length })}
        </p>
      </header>

      {league ? (
        <section className="border-border bg-card mb-8 rounded-xl border p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-muted-foreground font-mono text-[11px] tracking-[0.24em] uppercase">
                {t("leagueEyebrow")}
              </p>
              <p className="font-heading text-foreground text-lg font-semibold tracking-tight">
                {league.name}
              </p>
            </div>
            <Link
              href={localePath(locale, `/${league.slug}/matches`)}
              className="border-border hover:bg-secondary inline-flex min-h-9 items-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors"
            >
              {t("viewFixtures")}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          {fixtures.length > 0 ? (
            <div className="mt-3">
              <FixturesStrip fixtures={fixtures} />
            </div>
          ) : null}
        </section>
      ) : null}

      {activePhase ? (
        <section className="border-pitch/40 bg-pitch/5 mb-8 rounded-xl border p-4 sm:p-5">
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.24em] uppercase">
            {t("phaseActiveEyebrow")}
          </p>
          <p className="font-heading text-foreground mt-1 text-lg font-semibold tracking-tight">
            {activePhase.label}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {activePhase.endsAt
              ? t.rich("phaseClosesOn", {
                  date: () => <LocalTime iso={activePhase.endsAt as string} format="date" />,
                })
              : t("phaseRunsToEnd")}
          </p>
        </section>
      ) : null}

      {roundWindow && league ? (
        <section className="mt-8">
          <RoundList
            actionable={roundWindow.actionable}
            past={roundWindow.past}
            groupId={id}
            league={league.slug}
            locale={locale}
          />
        </section>
      ) : null}

      <InviteShare code={group.joinCode} locale={locale} currentUserId={group.currentUserId} />
      {group.currentUserId ? <InviteByEmail groupId={group.id} locale={locale} /> : null}

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {t("boardTitle")}
        </h2>
        {phases.length > 0 ? (
          <div className="mb-3">
            <PhaseSwitcher
              basePath={basePath}
              phases={phases}
              activePhaseId={selectedPhase?.id ?? null}
              labels={{
                group: t("phaseSwitcherLabel"),
                allTime: t("phaseBoardAllTime"),
                closed: t("phaseStatusClosed"),
                active: t("phaseStatusActive"),
                pending: t("phaseStatusPending"),
              }}
            />
          </div>
        ) : null}

        {selectedPhase ? (
          <div className="mb-3 text-sm text-muted-foreground">
            <p>
              {selectedPhase.endsAt
                ? t.rich("phaseWindow", {
                    from: () => <LocalTime iso={selectedPhase.startsAt} format="date" />,
                    to: () => <LocalTime iso={selectedPhase.endsAt as string} format="date" />,
                  })
                : t.rich("phaseWindowOpen", {
                    from: () => <LocalTime iso={selectedPhase.startsAt} format="date" />,
                  })}{" "}
              {t("phaseWindowNote")}
            </p>
            {selectedPhase.status === "closed" ? (
              <div className="border-flag/40 bg-flag/10 mt-3 rounded-xl border p-4">
                <p className="text-muted-foreground font-mono text-[11px] tracking-[0.24em] uppercase">
                  {selectedWinners.length > 1 ? t("phaseJointWinners") : t("phaseWinnerTitle")}
                </p>
                {selectedWinners.length === 0 ? (
                  <p className="mt-1 text-sm">{t("phaseWinnerNone")}</p>
                ) : (
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {selectedWinners.map((w) => (
                      <li key={w.userId} className="flex items-center gap-1.5">
                        <TrophyIcon className="size-4 text-flag" aria-hidden />
                        <span className="font-heading text-base font-semibold tracking-tight text-foreground">
                          {w.displayName ?? t("noName")}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {w.totalPoints}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedWinners[0] ? (
                  <p className="mt-1 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
                    {t.rich("phaseDecidedOn", {
                      date: () => <LocalTime iso={selectedWinners[0].decidedAt} format="date" />,
                    })}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-1">{t("phaseProvisional")}</p>
            )}
          </div>
        ) : (
          <p className="mb-3 text-sm text-muted-foreground">{t("joinDateScoringNote")}</p>
        )}

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              {t("boardEmptyTitle")}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              {selectedPhase ? t("phaseBoardEmpty") : t("boardEmptyBody")}
            </p>
          </div>
        ) : (
          <LeaderboardTable
            rows={rows}
            currentUserId={group.currentUserId}
            labels={{
              rank: t("boardRank"),
              player: t("boardPlayer"),
              points: t("boardPoints"),
              exact: t("boardExact"),
              winnerGd: t("boardWinnerGd"),
              wins: t("boardWins"),
              you: t("you"),
              noName: t("noName"),
            }}
            rowMarker={(r) =>
              lateJoiners.has(r.user_id) ? (
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t("phaseLateJoiner")}
                </span>
              ) : null
            }
          />
        )}

        {group.currentUserId && !myRow && rows.length > 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            {t("notYetRanked")}
          </p>
        ) : null}
      </section>

      {closedPhases.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {t("phaseSummaryTitle")}
          </h2>
          <PhaseSeasonSummary
            members={group.members}
            closedPhases={closedPhases}
            winners={winners}
            currentUserId={group.currentUserId}
            labels={{
              title: t("phaseSummaryTitle"),
              player: t("boardPlayer"),
              won: (count) => t("phaseSummaryWon", { count }),
              noName: t("noName"),
              you: t("you"),
            }}
          />
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {t("membersTitle")}
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {group.members.map((m) => {
            const isGroupOwner = m.userId === group.ownerId;
            return (
              <li key={m.userId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">
                    {m.displayName ?? (
                      <span className="italic text-muted-foreground">{t("noName")}</span>
                    )}
                  </span>
                  {isGroupOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-flag/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-flag">
                      <CrownIcon className="size-3" /> {t("ownerLabel")}
                    </span>
                  ) : null}
                  {m.userId === group.currentUserId ? (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {t("you")}
                    </span>
                  ) : null}
                </div>
                {group.isOwner && !isGroupOwner ? (
                  <RemoveMemberButton
                    groupId={group.id}
                    userId={m.userId}
                    memberName={m.displayName ?? t("noName")}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8 flex flex-col gap-4 border-t border-border pt-6">
        {group.isOwner ? (
          <>
            <RenameGroupForm groupId={group.id} currentName={group.name} />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t("deleteHint")}</p>
              <DeleteGroupButton groupId={group.id} locale={locale} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("leaveHint")}</p>
            <LeaveGroupButton groupId={group.id} locale={locale} />
          </div>
        )}
      </section>
    </main>
  );
}
