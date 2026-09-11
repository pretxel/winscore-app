import "server-only";
import { getTranslations } from "next-intl/server";
import { Resend } from "resend";
import { isOptedIn } from "@/lib/email-prefs";
import { env } from "@/lib/env";
import { DEFAULT_LOCALE, localePath } from "@/lib/i18n";
import { isConfirmedMatch, isLocked } from "@/lib/match-utils";
import { pickLabel } from "@/lib/phases";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkEmailSenderConfig } from "./email-sender-config";
import {
  computePendingPredictionReminders,
  type DispatchSummary,
  formatKickoffLabel,
  type PredictionRecipient,
  type TodayMatch,
} from "./prediction-reminder-emails";
import {
  type PredictionReminderMatch,
  renderPredictionReminderEmail,
} from "./prediction-reminder-template";

// The daily reminder tells a player what kicks off today. This one lands a day
// ahead of a whole round, while there is still time to think about it — the
// moment most players actually want, since a matchday is the unit they follow.
//
// Everything downstream of "which fixtures does this player still owe" is
// shared with the daily reminder: the same pending computation, the same
// template, the same opt-out. Only the selection and the ledger differ.

// How close the round's first kickoff has to be before the reminder goes out.
// The cron runs once a day, so a window of exactly one day means every round
// gets caught by exactly one run: a round further out than this is picked up on
// a later day, and one closer than this was already picked up yesterday.
export const ROUND_REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

const RESEND_BATCH_LIMIT = 100;
const SUPABASE_PAGE_LIMIT = 1000;

const ZERO: DispatchSummary = { emailed: 0, failed: 0, skipped: 0 };

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

/** A round of a competition, with the kickoff of its earliest live fixture. */
export interface UpcomingRound {
  id: string;
  label: string;
  firstKickoff: string;
}

/**
 * Pure: the round whose first kickoff falls inside the lead window.
 *
 * A round that has already started is not "coming up" and is left to the daily
 * reminder. When two rounds qualify — two competitions' matchdays landing on
 * the same weekend is ordinary — the earliest one wins, so a player is never
 * asked about a later round before the one in front of it.
 */
export function selectUpcomingRound(
  rounds: UpcomingRound[],
  now: Date,
  leadMs: number = ROUND_REMINDER_LEAD_MS,
): UpcomingRound | null {
  const from = now.getTime();
  const to = from + leadMs;
  const inWindow = rounds
    .filter((r) => {
      const kickoff = Date.parse(r.firstKickoff);
      return Number.isFinite(kickoff) && kickoff > from && kickoff <= to;
    })
    .sort((a, b) => Date.parse(a.firstKickoff) - Date.parse(b.firstKickoff));
  return inWindow[0] ?? null;
}

// Every assigned, non-cancelled fixture of a competition that is still ahead of
// us, keyed by round. The round's first kickoff is derived from the fixtures
// rather than read from competition_rounds.opens_at, so a rescheduled opener
// moves the reminder with it.
async function loadRoundsWithFixtures(
  admin: AdminClient,
  competitionId: string,
  now: Date,
): Promise<{ rounds: UpcomingRound[]; byRound: Map<string, TodayMatch[]> }> {
  const { data: roundRows, error: roundErr } = await admin
    .from("competition_rounds")
    .select("id, round_key, labels")
    .eq("competition_id", competitionId);
  if (roundErr) throw new Error(`[round-reminders] load rounds: ${roundErr.message}`);

  const labels = new Map<string, string>();
  for (const r of roundRows ?? []) {
    labels.set(
      r.id as string,
      pickLabel(r.labels as Record<string, unknown> | null, DEFAULT_LOCALE, r.round_key as string),
    );
  }
  if (labels.size === 0) return { rounds: [], byRound: new Map() };

  const firstKickoff = new Map<string, string>();
  const byRound = new Map<string, TodayMatch[]>();
  for (let offset = 0; ; offset += SUPABASE_PAGE_LIMIT) {
    const { data, error } = await admin
      .from("matches")
      .select("id, home_team, away_team, kickoff_at, status, round_id")
      .eq("competition_id", competitionId)
      .not("round_id", "is", null)
      .gte("kickoff_at", now.toISOString())
      .order("kickoff_at", { ascending: true })
      .range(offset, offset + SUPABASE_PAGE_LIMIT - 1);
    if (error) throw new Error(`[round-reminders] load fixtures: ${error.message}`);
    const page = data ?? [];
    for (const m of page) {
      const roundId = m.round_id as string;
      if (!labels.has(roundId)) continue;
      const match = {
        id: m.id as string,
        home_team: m.home_team as string,
        away_team: m.away_team as string,
        kickoff_at: m.kickoff_at as string,
        status: m.status as string,
      };
      if (match.status === "cancelled") continue;
      // The round's start is the earliest fixture still on the calendar,
      // cancelled ones excluded. Rows arrive sorted, so the first wins.
      if (!firstKickoff.has(roundId)) firstKickoff.set(roundId, match.kickoff_at);
      // Only actionable fixtures are worth listing: a placeholder knockout tie
      // has no teams to predict, and a locked one can no longer be picked.
      if (!isConfirmedMatch(match) || isLocked(match)) continue;
      const list = byRound.get(roundId) ?? [];
      list.push({
        id: match.id,
        home_team: match.home_team,
        away_team: match.away_team,
        kickoff_at: match.kickoff_at,
      });
      byRound.set(roundId, list);
    }
    if (page.length < SUPABASE_PAGE_LIMIT) break;
  }

  const rounds: UpcomingRound[] = [];
  for (const [id, kickoff] of firstKickoff) {
    rounds.push({ id, label: labels.get(id) as string, firstKickoff: kickoff });
  }
  return { rounds, byRound };
}

// Opted-in players. The round reminder rides the same `prediction_reminder`
// preference as the daily one: both are "you owe a pick", and a player who
// silenced one meant both.
async function loadOptedInProfiles(admin: AdminClient): Promise<PredictionRecipient[]> {
  const out: PredictionRecipient[] = [];
  for (let offset = 0; ; offset += SUPABASE_PAGE_LIMIT) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, display_name, unsubscribe_token, email_prefs, timezone")
      .order("id", { ascending: true })
      .range(offset, offset + SUPABASE_PAGE_LIMIT - 1);
    if (error) throw new Error(`[round-reminders] load profiles: ${error.message}`);
    const page = data ?? [];
    for (const p of page) {
      if (!isOptedIn(p.email_prefs, "prediction_reminder")) continue;
      out.push({
        userId: p.id as string,
        displayName: (p.display_name as string | null) ?? null,
        unsubscribeToken: p.unsubscribe_token as string,
        timezone: (p.timezone as string | null) ?? null,
      });
    }
    if (page.length < SUPABASE_PAGE_LIMIT) break;
  }
  return out;
}

async function loadPredictionsForMatches(
  admin: AdminClient,
  matchIds: string[],
): Promise<{ user_id: string; match_id: string }[]> {
  const out: { user_id: string; match_id: string }[] = [];
  if (matchIds.length === 0) return out;
  for (let offset = 0; ; offset += SUPABASE_PAGE_LIMIT) {
    const { data, error } = await admin
      .from("predictions")
      .select("user_id, match_id")
      .in("match_id", matchIds)
      .order("id", { ascending: true })
      .range(offset, offset + SUPABASE_PAGE_LIMIT - 1);
    if (error) throw new Error(`[round-reminders] load predictions: ${error.message}`);
    const page = data ?? [];
    for (const r of page) {
      out.push({ user_id: r.user_id as string, match_id: r.match_id as string });
    }
    if (page.length < SUPABASE_PAGE_LIMIT) break;
  }
  return out;
}

// Players already reminded about THIS round. The key is the round, not a date:
// a round spans days, and the point of the reminder is to arrive once.
async function loadRemindedUserIds(admin: AdminClient, roundId: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += SUPABASE_PAGE_LIMIT) {
    const { data, error } = await admin
      .from("round_reminder_log")
      .select("user_id")
      .eq("round_id", roundId)
      .order("user_id", { ascending: true })
      .range(offset, offset + SUPABASE_PAGE_LIMIT - 1);
    if (error) throw new Error(`[round-reminders] load ledger: ${error.message}`);
    const page = data ?? [];
    for (const r of page) out.push(r.user_id as string);
    if (page.length < SUPABASE_PAGE_LIMIT) break;
  }
  return out;
}

async function resolveEmail(admin: AdminClient, userId: string): Promise<string | null> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) {
      console.error(`[round-reminders] getUserById ${userId} failed:`, error.message);
      return null;
    }
    return data.user?.email ?? null;
  } catch (err) {
    console.error(`[round-reminders] getUserById ${userId} threw:`, err);
    return null;
  }
}

function withFromName(emailFrom: string, name?: string): string {
  if (!name) return emailFrom;
  const m = emailFrom.match(/<([^>]+)>/);
  return m ? `${name} <${m[1]}>` : emailFrom;
}

type Translator = (key: string, values?: Record<string, unknown>) => string;

interface PreparedMessage {
  payload: {
    from: string;
    replyTo: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
    headers: Record<string, string>;
  };
  row: { user_id: string; round_id: string };
}

/**
 * Cron path: emails every opted-in player the fixtures of the round about to
 * start that they have not predicted yet.
 *
 * Idempotent per player per round via the round_reminder_log ledger, so the
 * daily run only ever writes to a player once about a given matchday. No-ops
 * when RESEND_API_KEY is unset, when the league has no rounds, or when no
 * round starts inside the lead window. Per-recipient failures are logged and
 * counted, never aborting the rest; ledger rows are written only for messages
 * Resend accepted, so a failed batch retries on the next run.
 */
export async function dispatchRoundReminders(
  fromName?: string,
  leagueSlug?: string,
  competitionId?: string,
  now: Date = new Date(),
): Promise<DispatchSummary> {
  const check = checkEmailSenderConfig();
  if (check.shouldWarn) console.warn(`[round-reminders] dispatch: ${check.message}`);
  const flag = check.shouldWarn ? { senderMisconfigured: true } : {};

  if (!env.resendApiKey) {
    console.log("[round-reminders] RESEND_API_KEY unset — skipping dispatch");
    return { ...ZERO, ...flag };
  }
  if (!competitionId) {
    console.log("[round-reminders] no competition in scope — nothing to send");
    return { ...ZERO, ...flag };
  }

  const admin = createAdminSupabaseClient(leagueSlug);

  const { rounds, byRound } = await loadRoundsWithFixtures(admin, competitionId, now);
  const round = selectUpcomingRound(rounds, now);
  if (!round) {
    console.log("[round-reminders] no round starts inside the lead window — nothing to send");
    return { ...ZERO, ...flag };
  }

  const matches = byRound.get(round.id) ?? [];
  if (matches.length === 0) {
    console.log(`[round-reminders] ${round.label} has no pickable fixtures — nothing to send`);
    return { ...ZERO, ...flag };
  }

  const [profiles, predictions, remindedUserIds] = await Promise.all([
    loadOptedInProfiles(admin),
    loadPredictionsForMatches(
      admin,
      matches.map((m) => m.id),
    ),
    loadRemindedUserIds(admin, round.id),
  ]);

  // No local-hour bucketing here, unlike the daily reminder. This mail is about
  // tomorrow, not the next few hours, so the hour it lands at matters far less
  // than it reaching everyone on the one run the schedule allows.
  const pending = computePendingPredictionReminders(
    profiles,
    matches,
    predictions,
    remindedUserIds,
  );
  if (pending.length === 0) {
    console.log("[round-reminders] emailed=0 failed=0 skipped=0 (no pending)");
    return { ...ZERO, ...flag };
  }

  const t = (await getTranslations({
    locale: DEFAULT_LOCALE,
    namespace: "roundReminderEmail",
  })) as Translator;
  const predictionsUrl = `${env.siteUrl}${localePath(DEFAULT_LOCALE, "/matches?picks=needed")}`;
  const fromAddress = withFromName(env.emailFrom, fromName);
  const resend = new Resend(env.resendApiKey);

  let skipped = 0;
  const prepared: PreparedMessage[] = [];
  for (const { recipient, matches: pendingMatches } of pending) {
    const email = await resolveEmail(admin, recipient.userId);
    if (!email) {
      skipped++;
      continue;
    }
    const unsubscribeUrl = `${env.siteUrl}/api/prediction-reminders/unsubscribe?token=${recipient.unsubscribeToken}`;
    const rows: PredictionReminderMatch[] = pendingMatches.map((m) => ({
      home: m.home_team,
      away: m.away_team,
      kickoffLabel: formatKickoffLabel(m.kickoff_at),
    }));
    const { subject, html, text } = renderPredictionReminderEmail({
      strings: {
        subject: t("subject", { round: round.label }),
        preheader: t("preheader", { round: round.label }),
        eyebrow: round.label,
        heading: recipient.displayName
          ? t("heading", { name: recipient.displayName, round: round.label })
          : t("headingNoName", { round: round.label }),
        intro: t("intro", { round: round.label }),
        listLabel: t("listLabel"),
        vs: t("vs"),
        ctaLabel: t("ctaLabel"),
        footer: t("footer"),
        unsubscribeLabel: t("unsubscribeLabel"),
      },
      matches: rows,
      predictionsUrl,
      unsubscribeUrl,
    });
    prepared.push({
      payload: {
        from: fromAddress,
        replyTo: env.emailReplyTo,
        to: [email],
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      row: { user_id: recipient.userId, round_id: round.id },
    });
  }

  let emailed = 0;
  let failed = 0;
  for (let i = 0; i < prepared.length; i += RESEND_BATCH_LIMIT) {
    const chunk = prepared.slice(i, i + RESEND_BATCH_LIMIT);
    try {
      const { error } = await resend.batch.send(chunk.map((c) => c.payload));
      if (error) throw new Error(error.message ?? "resend batch error");

      const { error: insErr } = await admin.from("round_reminder_log").upsert(
        chunk.map((c) => c.row),
        { onConflict: "user_id,round_id", ignoreDuplicates: true },
      );
      if (insErr) {
        // The mail went out; failing to log it risks a duplicate next run, but
        // never a lost send. Surface it loudly rather than silently retrying.
        console.error("[round-reminders] ledger write failed:", insErr.message);
      }
      emailed += chunk.length;
    } catch (err) {
      failed += chunk.length;
      console.error("[round-reminders] batch send failed:", err);
    }
  }

  console.log(
    `[round-reminders] ${round.label}: emailed=${emailed} failed=${failed} skipped=${skipped}`,
  );
  return { emailed, failed, skipped, ...flag };
}
