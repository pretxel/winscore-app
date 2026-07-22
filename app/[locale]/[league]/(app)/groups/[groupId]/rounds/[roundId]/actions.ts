"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isConfirmedMatch } from "@/lib/match-utils";
import { isCurrentUserAdmin } from "@/lib/admin/current-user";
import type { Locale } from "@/lib/i18n";

const predictionSchema = z.object({
  matchId: z.string().uuid(),
  homeGoals: z.number().int().min(0).max(20),
  awayGoals: z.number().int().min(0).max(20),
});

const bulkSchema = z.object({
  poolId: z.string().uuid(),
  roundId: z.string().uuid(),
  league: z.string().min(1),
  predictions: z.array(predictionSchema).max(100),
});

export type BulkPredictionResult =
  | { ok: true; saved: number; locked: string[] }
  | { ok: false; error: string };

export async function submitBulkPredictions(
  input: unknown
): Promise<BulkPredictionResult> {
  const t = await getTranslations("matchdaySheet");

  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t("errorInvalidInput") };
  }

  const { poolId, roundId, league, predictions } = parsed.data;
  const supabase = await createServerSupabaseClient(league);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("errorNotSignedIn") };

  if (await isCurrentUserAdmin(supabase)) {
    return { ok: false, error: t("adminBlocked") };
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", poolId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: t("errorNotMember") };
  }

  const matchIds = predictions.map((p) => p.matchId);

  const { data: matches, error: matchError } = await supabase
    .from("matches")
    .select("id, status, kickoff_at, round_id")
    .in("id", matchIds);

  if (matchError) {
    return { ok: false, error: matchError.message };
  }

  const matchMap = new Map((matches ?? []).map((m) => [m.id, m]));
  const locked: string[] = [];
  const eligible = new Map<string, { home: number; away: number }>();

  for (const pred of predictions) {
    const match = matchMap.get(pred.matchId);

    if (!match) {
      continue;
    }

    if (match.round_id !== roundId) {
      continue;
    }

    const kickoffAt = new Date(match.kickoff_at).getTime();
    if (
      match.status === "final" ||
      match.status === "cancelled" ||
      match.status === "live" ||
      kickoffAt <= Date.now()
    ) {
      locked.push(pred.matchId);
      continue;
    }

    eligible.set(pred.matchId, {
      home: pred.homeGoals,
      away: pred.awayGoals,
    });
  }

  let saved = 0;
  for (const [matchId, goals] of eligible) {
    const { error } = await supabase.from("predictions").upsert(
      {
        user_id: user.id,
        match_id: matchId,
        home_goals: goals.home,
        away_goals: goals.away,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,match_id" }
    );

    if (error) {
      // RLS lock or other rejection — count as locked, not saved
      if (error.code === "42501" || /row-level security/i.test(error.message)) {
        locked.push(matchId);
      }
      continue;
    }
    saved++;
  }

  revalidatePath(`/${league}/groups/${poolId}`);
  return { ok: true, saved, locked };
}
