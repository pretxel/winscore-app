import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface MatchStub {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
}

export interface RoundProgress {
  roundId: string;
  label: string;
  roundNumber: number;
  startsAt: string;
  endsAt: string;
  total: number;
  predicted: number;
  /** Unpredicted AND not yet kicked off — the only ones still actionable. */
  openMatches: MatchStub[];
  /** Unpredicted but already started; permanently missed. */
  lockedUnpredicted: number;
  state: "open" | "in_progress" | "past";
  wagerAvailable: boolean;
}

interface RoundRow {
  id: string;
  round_key: string;
  round_number: number;
  labels: Record<string, string> | null;
}

interface MatchRow {
  id: string;
  round_id: string | null;
  home_team: string;
  away_team: string;
  kickoff_at: string;
}

/**
 * Shapes rows into per-round progress. Pure and separately exported so the
 * classification rules can be tested without a database.
 *
 * State comes from kickoff times rather than competition_rounds.status, which
 * is a display label — Liga MX Jornada 3 sits at 3 of 9 fixtures final while
 * the rest are still predictable, and a status-based rule would misread it.
 */
export function buildRoundProgress(input: {
  rounds: RoundRow[];
  matches: MatchRow[];
  predictedMatchIds: Set<string>;
  wagerRoundIds: Set<string>;
  locale: string;
  now: Date;
}): RoundProgress[] {
  const byRound = new Map<string, MatchRow[]>();
  for (const m of input.matches) {
    if (!m.round_id) continue;
    const list = byRound.get(m.round_id);
    if (list) list.push(m);
    else byRound.set(m.round_id, [m]);
  }

  const nowMs = input.now.getTime();
  const result: RoundProgress[] = [];

  for (const round of input.rounds) {
    const fixtures = byRound.get(round.id);
    // A round with no fixtures assigned has nothing to predict.
    if (!fixtures?.length) continue;

    const sorted = [...fixtures].sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));

    let predicted = 0;
    let started = 0;
    let lockedUnpredicted = 0;
    const openMatches: MatchStub[] = [];

    for (const m of sorted) {
      const hasPick = input.predictedMatchIds.has(m.id);
      const hasStarted = new Date(m.kickoff_at).getTime() <= nowMs;

      if (hasPick) predicted += 1;
      if (hasStarted) started += 1;

      if (!hasPick && hasStarted) lockedUnpredicted += 1;
      if (!hasPick && !hasStarted) {
        openMatches.push({
          id: m.id,
          homeTeam: m.home_team,
          awayTeam: m.away_team,
          kickoffAt: m.kickoff_at,
        });
      }
    }

    const state: RoundProgress["state"] =
      started === 0 ? "open" : started === sorted.length ? "past" : "in_progress";

    result.push({
      roundId: round.id,
      label: round.labels?.[input.locale] ?? round.round_key,
      roundNumber: round.round_number,
      startsAt: sorted[0].kickoff_at,
      endsAt: sorted[sorted.length - 1].kickoff_at,
      total: sorted.length,
      predicted,
      openMatches,
      lockedUnpredicted,
      state,
      wagerAvailable: input.wagerRoundIds.has(round.id),
    });
  }

  return result.sort((a, b) => a.roundNumber - b.roundNumber);
}

/**
 * Every round of the pool's competition with this member's progress.
 *
 * Predictions are per (user, match) with no pool dimension, so a pick made in
 * one pool counts in every pool on the same competition.
 */
export async function getRoundProgress(
  groupId: string,
  userId: string,
  locale: string,
): Promise<RoundProgress[]> {
  const supabase = await createServerSupabaseClient();

  const { data: group } = await supabase
    .from("groups")
    .select("competition_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group?.competition_id) return [];

  const { data: rounds } = await supabase
    .from("competition_rounds")
    .select("id, round_key, round_number, labels")
    .eq("competition_id", group.competition_id)
    .order("round_number");
  if (!rounds?.length) return [];

  const { data: matches } = await supabase
    .from("matches")
    .select("id, round_id, home_team, away_team, kickoff_at")
    .eq("competition_id", group.competition_id)
    .not("round_id", "is", null);

  const matchIds = (matches ?? []).map((m) => m.id);
  const { data: preds } = matchIds.length
    ? await supabase.from("predictions").select("match_id").eq("user_id", userId).in("match_id", matchIds)
    : { data: [] };

  const { data: wagerRounds } = await supabase
    .from("wager_rounds")
    .select("round_id")
    .eq("group_id", groupId)
    .eq("state", "initialized");

  return buildRoundProgress({
    rounds: rounds as RoundRow[],
    matches: (matches ?? []) as MatchRow[],
    predictedMatchIds: new Set((preds ?? []).map((p) => p.match_id as string)),
    wagerRoundIds: new Set((wagerRounds ?? []).map((w) => w.round_id as string)),
    locale,
    now: new Date(),
  });
}
