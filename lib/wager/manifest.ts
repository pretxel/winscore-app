/**
 * Settlement manifest and Merkle claim preparation.
 * Builds deterministic, versioned, auditable settlement artifacts.
 *
 * Scoring and ranking come from `score_wager_round_entries`, which calls the
 * canonical `score_prediction` / `resolve_stage_multiplier` primitives against
 * the immutable pick snapshot. This module must not re-derive points, or a
 * wagered standing could diverge from the free one (stage multipliers in
 * particular).
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireBytea } from "./bytea";
import type { MerkleLeaf } from "./merkle-tree";
import { buildMerkleTree } from "./merkle-tree";
import { deriveWagerRoundPda } from "./pda";
import { allocatePot, verifyPotConservation } from "./pot-allocation";

export interface SettlementManifest {
  version: number;
  wagerRoundId: string;
  roundId: string;
  groupId: string;
  fixtureResults: Array<{
    matchId: string;
    homeScore: number;
    awayScore: number;
    status: string;
  }>;
  entries: Array<{
    entryId: string;
    userId: string;
    walletPubkeyBytes: Uint8Array;
    pickCommitment: Uint8Array;
    totalPoints: number;
    exactHits: number;
    winnerGdHits: number;
    winnerHits: number;
    firstSubmit: string;
    rank: number;
    awardBaseUnits: number;
  }>;
  merkleRoot: Uint8Array;
  totalPot: number;
  winnerCount: number;
  generatedAt: string;
}

export async function buildSettlementManifest(
  wagerRoundId: string,
): Promise<{ manifest: SettlementManifest; merkleLeaves: MerkleLeaf[] }> {
  const admin = createAdminSupabaseClient();

  const { data: wagerRound } = await admin
    .from("wager_rounds")
    .select("*")
    .eq("id", wagerRoundId)
    .single();

  if (!wagerRound) throw new Error("Wager round not found");

  const { data: fixtures } = await admin
    .from("matches")
    .select("id, home_score, away_score, status")
    .eq("round_id", wagerRound.round_id)
    .eq("status", "final");

  // Canonical scoring + ranking, ordered by rank ascending.
  const { data: standings, error: standingsError } = await admin.rpc("score_wager_round_entries", {
    p_wager_round_id: wagerRoundId,
  });

  if (standingsError) {
    throw new Error(`Scoring wager round failed: ${standingsError.message}`);
  }
  if (!standings?.length) throw new Error("No confirmed entries");

  // The pick commitment lives on the intent, keyed by entry.
  const { data: entryIntents } = await admin
    .from("wager_entries")
    .select("id, wager_intents!inner(pick_commitment)")
    .eq("wager_round_id", wagerRoundId);

  const commitmentByEntry = new Map<string, Uint8Array>();
  for (const row of entryIntents ?? []) {
    commitmentByEntry.set(
      row.id,
      requireBytea(row.wager_intents.pick_commitment, 32, "pick_commitment"),
    );
  }

  const entryResults: SettlementManifest["entries"] = standings.map((s) => {
    const commitment = commitmentByEntry.get(s.entry_id);
    if (!commitment) throw new Error(`Entry ${s.entry_id} has no pick commitment`);
    return {
      entryId: s.entry_id,
      userId: s.user_id,
      walletPubkeyBytes: requireBytea(s.wallet_address, 32, "wallet_address"),
      pickCommitment: commitment,
      totalPoints: s.total_points,
      exactHits: s.exact_hits,
      winnerGdHits: s.winner_gd_hits,
      winnerHits: s.winner_hits,
      firstSubmit: s.first_submit ?? "",
      rank: s.rank,
      awardBaseUnits: 0,
    };
  });

  const winners = entryResults.filter((e) => e.rank === 1);

  const potTotal = Number(wagerRound.pot_total_base_units ?? 0);
  const allocations = allocatePot(
    potTotal,
    winners.map((w) => ({ userId: w.userId, walletPubkey: w.walletPubkeyBytes })),
  );

  // The program rejects a settle whose total_distributable != the vault balance,
  // so a manifest that loses or invents base units is unsettleable. Fail here
  // rather than on chain.
  if (!verifyPotConservation(potTotal, allocations)) {
    throw new Error("Pot allocation does not sum to the pot total");
  }

  for (const w of entryResults) {
    const allocation = allocations.find((a) => a.userId === w.userId);
    w.awardBaseUnits = allocation?.awardBaseUnits ?? 0;
  }

  const merkleLeaves: MerkleLeaf[] = allocations.map((a) => ({
    winnerWalletBytes: a.walletPubkey,
    awardBaseUnits: a.awardBaseUnits,
  }));

  const { bytes: wagerRoundPubkey } = await deriveWagerRoundPda(
    wagerRound.group_id,
    wagerRound.round_id,
  );
  const tree = buildMerkleTree(wagerRoundPubkey, merkleLeaves);

  const manifest: SettlementManifest = {
    version: 1,
    wagerRoundId,
    roundId: wagerRound.round_id,
    groupId: wagerRound.group_id,
    fixtureResults: (fixtures ?? []).map((f) => ({
      matchId: f.id,
      homeScore: f.home_score ?? 0,
      awayScore: f.away_score ?? 0,
      status: f.status,
    })),
    entries: entryResults,
    merkleRoot: tree.root,
    totalPot: potTotal,
    winnerCount: winners.length,
    generatedAt: new Date().toISOString(),
  };

  return { manifest, merkleLeaves };
}
