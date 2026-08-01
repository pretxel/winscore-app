import "server-only";

import { base58 } from "@scure/base";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { byteaToBytes } from "@/lib/wager/bytea";

export interface PayoutStatus {
  kind: "claim" | "refund";
  /** Settlement id for a claim, wager round id for a refund. */
  targetId: string;
  /** Award (claim) or stake (refund), scaled by the round's verified decimals. */
  amountDisplay: string;
  alreadySettled: boolean;
}

export interface WagerResultRow {
  rank: number;
  displayName: string;
  points: number;
  exactHits: number;
  winnerGdHits: number;
  winnerHits: number;
  award: string;
  tokenSymbol: string;
  claimState: "pending" | "claimed" | "refunded" | "not_winner";
  claimSignature?: string;
}

export interface WagerResults {
  entries: WagerResultRow[];
  manifestHash?: string;
  settlementSignature?: string;
  totalPot: string;
  tokenSymbol: string;
}

function toDisplay(baseUnits: number | string | null, decimals: number): string {
  return (Number(baseUnits ?? 0) / 10 ** decimals).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
}

/**
 * Resolve whether a member has money to pull out of a finished wager round.
 *
 * Claims and refunds are mutually exclusive on chain — a round either settles to
 * winners or is cancelled and refunded — so this returns at most one of them.
 * Terminal rows are returned too (rather than hidden) so a member can always see
 * the receipt and explorer link for a payout that already landed.
 *
 * Reads through the service role because wager_claims and wager_settlements are
 * RLS-closed to end users; every query is still scoped to the caller's own id.
 */
export async function getPayoutStatus(
  groupId: string,
  roundId: string,
  userId: string,
): Promise<PayoutStatus | null> {
  const admin = createAdminSupabaseClient();

  const { data: round } = await admin
    .from("wager_rounds")
    .select("id, state, verified_decimals")
    .eq("group_id", groupId)
    .eq("round_id", roundId)
    .maybeSingle();

  if (!round) return null;
  const decimals = round.verified_decimals ?? 0;

  if (round.state === "cancelled") {
    const { data: entry } = await admin
      .from("wager_entries")
      .select("state, stake_base_units")
      .eq("wager_round_id", round.id)
      .eq("user_id", userId)
      .maybeSingle();

    // A row in wager_entries only exists once the deposit was verified on chain,
    // so any state here has a stake sitting in the vault to pull back.
    if (!entry) return null;

    return {
      kind: "refund",
      targetId: round.id,
      amountDisplay: toDisplay(entry.stake_base_units, decimals),
      alreadySettled: entry.state === "refunded",
    };
  }

  if (round.state !== "settled") return null;

  const { data: settlement } = await admin
    .from("wager_settlements")
    .select("id, settled_at")
    .eq("wager_round_id", round.id)
    .maybeSingle();

  if (!settlement?.settled_at) return null;

  // No row means this member did not place first — not an error, just no award.
  const { data: claim } = await admin
    .from("wager_claims")
    .select("state, award_base_units")
    .eq("settlement_id", settlement.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!claim || claim.state === "failed") return null;

  return {
    kind: "claim",
    targetId: settlement.id,
    amountDisplay: toDisplay(claim.award_base_units, decimals),
    alreadySettled: claim.state === "claimed",
  };
}

/**
 * Build the settled standing for a wager round: who ranked where, what each
 * won, and the manifest/signature evidence backing it.
 *
 * Ranking comes from score_wager_round_entries rather than being recomputed
 * here, so the table shows exactly the canonical scoring and tie-breaks the
 * settlement manifest was built from. Returns null until a round is actually
 * settled on chain — there is no standing to show before that.
 */
export async function getWagerResults(
  groupId: string,
  roundId: string,
  tokenSymbol = "TOKEN",
): Promise<WagerResults | null> {
  const admin = createAdminSupabaseClient();

  const { data: round } = await admin
    .from("wager_rounds")
    .select("id, state, verified_decimals, pot_total_base_units")
    .eq("group_id", groupId)
    .eq("round_id", roundId)
    .maybeSingle();

  if (!round || round.state !== "settled") return null;
  const decimals = round.verified_decimals ?? 0;

  const { data: settlement } = await admin
    .from("wager_settlements")
    .select("id, manifest_hash, settlement_signature, settled_at")
    .eq("wager_round_id", round.id)
    .maybeSingle();

  if (!settlement?.settled_at) return null;

  const { data: ranked } = await admin.rpc("score_wager_round_entries", {
    p_wager_round_id: round.id,
  });
  if (!ranked?.length) return null;

  const { data: claims } = await admin
    .from("wager_claims")
    .select("entry_id, state, award_base_units, claim_signature")
    .eq("settlement_id", settlement.id);

  const claimByEntry = new Map((claims ?? []).map((c) => [c.entry_id as string, c]));

  const userIds = ranked.map((r: { user_id: string }) => r.user_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string]));

  const toBase58 = (value: unknown): string | undefined => {
    const bytes = byteaToBytes(value);
    return bytes ? base58.encode(bytes) : undefined;
  };

  const entries: WagerResultRow[] = ranked.map(
    (row: {
      entry_id: string;
      user_id: string;
      total_points: number;
      exact_hits: number;
      winner_gd_hits: number;
      winner_hits: number;
      rank: number;
    }) => {
      const claim = claimByEntry.get(row.entry_id);
      return {
        rank: row.rank,
        displayName: nameById.get(row.user_id) ?? "—",
        points: row.total_points,
        exactHits: row.exact_hits,
        winnerGdHits: row.winner_gd_hits,
        winnerHits: row.winner_hits,
        award: claim ? toDisplay(claim.award_base_units, decimals) : "0",
        tokenSymbol,
        claimState: claim ? (claim.state === "claimed" ? "claimed" : "pending") : "not_winner",
        claimSignature: claim ? toBase58(claim.claim_signature) : undefined,
      };
    },
  );

  return {
    entries,
    manifestHash: toBase58(settlement.manifest_hash),
    settlementSignature: toBase58(settlement.settlement_signature),
    totalPot: toDisplay(round.pot_total_base_units, decimals),
    tokenSymbol,
  };
}
