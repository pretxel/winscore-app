"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { isCurrentUserAdmin } from "@/lib/admin/current-user";
import { isConfirmedMatch } from "@/lib/match-utils";
import { foldCounts, REACTION_TYPES, type ReactionType } from "@/lib/recap-reactions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  matchId: z.string().uuid(),
  // The route league slug — scopes the DB client (x-league header) so the match
  // lookup + prediction upsert resolve against this league, and drives the
  // path revalidation below.
  league: z.string().min(1),
  homeGoals: z.number().int().min(0).max(20),
  awayGoals: z.number().int().min(0).max(20),
});

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitPrediction(input: unknown): Promise<SubmitResult> {
  const t = await getTranslations("predictionForm");
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t("errorInvalidScores") };
  }
  const { matchId, league, homeGoals, awayGoals } = parsed.data;

  const supabase = await createServerSupabaseClient(league);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: t("errorNotSignedIn") };
  }

  // Admins are operators, not contestants — reject server-side regardless of
  // the (disabled) client button.
  if (await isCurrentUserAdmin(supabase)) {
    return { ok: false, error: t("adminBlocked") };
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("status, kickoff_at, home_team, away_team, competition_id")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) {
    return { ok: false, error: matchError.message };
  }
  if (!match) {
    return { ok: false, error: t("errorMatchNotFound") };
  }

  // Check if the league is finished
  const { data: comp } = await supabase
    .from("competitions")
    .select("finished_at")
    .eq("id", match.competition_id)
    .maybeSingle();

  if (comp?.finished_at) {
    return { ok: false, error: t("leagueFinished") };
  }

  // Teams must be confirmed before a pick can be written — defends the hidden
  // form against a stale client or a direct POST for a placeholder matchup.
  if (!isConfirmedMatch(match)) {
    return { ok: false, error: t("errorNotConfirmed") };
  }

  if (match.status === "final") {
    return { ok: false, error: t("lockedFinal") };
  }
  if (match.status === "cancelled") {
    return { ok: false, error: t("lockedCancelled") };
  }
  if (match.status === "live") {
    return { ok: false, error: t("lockedLive") };
  }
  if (new Date(match.kickoff_at).getTime() <= Date.now()) {
    return { ok: false, error: t("lockedKickoff") };
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      match_id: matchId,
      home_goals: homeGoals,
      away_goals: awayGoals,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" },
  );

  if (error) {
    if (error.code === "42501" || /row-level security/i.test(error.message)) {
      return { ok: false, error: t("lockedKickoff") };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/en/${league}/matches/${matchId}`);
  revalidatePath(`/es/${league}/matches/${matchId}`);
  revalidatePath(`/fr/${league}/matches/${matchId}`);
  revalidatePath(`/en/${league}/my-picks`);
  revalidatePath(`/es/${league}/my-picks`);
  revalidatePath(`/fr/${league}/my-picks`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Recap reactions: toggle an emoji reaction on the active recap of a final
// match. RLS enforces own-row + active/final scoping; the SECURITY DEFINER RPC
// (toggle_recap_reaction) adds the per-user rate limit, re-checks the allowlist
// + active/final scope server-side, and returns the authoritative per-type
// counts so the client reconciles its optimistic update. Reactions carry no
// points and never touch scoring.
// ---------------------------------------------------------------------------

const reactionSchema = z.object({
  summaryId: z.string().uuid(),
  reaction: z.enum(REACTION_TYPES),
  on: z.boolean(),
});

export type ToggleReactionResult =
  | { ok: true; counts: Record<ReactionType, number> }
  | { ok: false; error: string };

export async function toggleRecapReaction(input: unknown): Promise<ToggleReactionResult> {
  const t = await getTranslations("recapReactions");
  const parsed = reactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t("errorInvalid") };
  }
  const { summaryId, reaction, on } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: t("errorNotSignedIn") };
  }

  const { data, error } = await supabase.rpc("toggle_recap_reaction", {
    p_summary_id: summaryId,
    p_reaction: reaction,
    p_on: on,
  });

  if (error) {
    if (/rate limit/i.test(error.message)) {
      return { ok: false, error: t("errorRateLimited") };
    }
    if (/not reactable|not allowed/i.test(error.message)) {
      return { ok: false, error: t("errorNotReactable") };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, counts: foldCounts(data ?? []) };
}
