/**
 * Settlement manifest and Merkle claim preparation.
 * Builds deterministic, versioned, auditable settlement artifacts.
 */

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { MerkleLeaf } from "./merkle-tree";
import { buildMerkleTree } from "./merkle-tree";
import { allocatePot } from "./pot-allocation";

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

  // Get wager round
  const { data: wagerRound } = await admin
    .from("wager_rounds")
    .select("*")
    .eq("id", wagerRoundId)
    .single();

  if (!wagerRound) throw new Error("Wager round not found");

  // Get fixture results
  const { data: fixtures } = await admin
    .from("matches")
    .select("id, home_score, away_score, status")
    .eq("round_id", wagerRound.round_id)
    .eq("status", "final");

  // Get confirmed entries with scores
  const { data: entries } = await admin
    .from("wager_entries")
    .select("id, user_id, wallet_address, intent_id")
    .eq("wager_round_id", wagerRoundId)
    .eq("state", "confirmed");

  if (!entries?.length) throw new Error("No confirmed entries");

  // Aggregate scores using the canonical SQL primitive
  // (For MVP, we compute inline; production calls the DB function)
  const entryResults: SettlementManifest["entries"] = [];

  for (const entry of entries) {
    // Get snapshot predictions
    const { data: preds } = await admin
      .from("wager_entry_predictions")
      .select("match_id, home_goals, away_goals, source_submitted_at")
      .eq("intent_id", entry.intent_id);

    let totalPoints = 0;
    let exactHits = 0;
    let winnerGdHits = 0;
    let winnerHits = 0;
    let firstSubmit = "";

    for (const pred of preds ?? []) {
      const fixture = (fixtures ?? []).find((f) => f.id === pred.match_id);
      if (!fixture || fixture.home_score == null || fixture.away_score == null) continue;

      const { home_goals, away_goals } = pred;
      const { home_score, away_score } = fixture;

      // Score prediction (matches the canonical primitive)
      let points = 0;
      let hitType = "miss";
      if (home_goals === home_score && away_goals === away_score) {
        points = 5;
        hitType = "exact";
      } else {
        const predDiff = home_goals - away_goals;
        const actualDiff = home_score - away_score;
        if (Math.sign(predDiff) === Math.sign(actualDiff)) {
          if (predDiff === actualDiff) {
            points = 3;
            hitType = "winner_gd";
          } else {
            points = 1;
            hitType = "winner";
          }
        }
      }

      totalPoints += points;
      if (hitType === "exact") exactHits++;
      if (hitType === "winner_gd") winnerGdHits++;
      if (hitType === "winner") winnerHits++;

      if (!firstSubmit || pred.source_submitted_at < firstSubmit) {
        firstSubmit = pred.source_submitted_at;
      }
    }

    const walletBytes =
      typeof entry.wallet_address === "string"
        ? Buffer.from(entry.wallet_address, "hex")
        : Buffer.from(entry.wallet_address as unknown as ArrayBuffer);

    entryResults.push({
      entryId: entry.id,
      userId: entry.user_id,
      walletPubkeyBytes: new Uint8Array(walletBytes),
      pickCommitment: new Uint8Array(32),
      totalPoints,
      exactHits,
      winnerGdHits,
      winnerHits,
      firstSubmit,
      rank: 0,
      awardBaseUnits: 0,
    });
  }

  // Rank entries (canonical tie-break)
  entryResults.sort((a, b) => {
    if (a.totalPoints !== b.totalPoints) return b.totalPoints - a.totalPoints;
    if (a.exactHits !== b.exactHits) return b.exactHits - a.exactHits;
    if (a.winnerGdHits !== b.winnerGdHits) return b.winnerGdHits - a.winnerGdHits;
    return a.firstSubmit.localeCompare(b.firstSubmit);
  });

  // Assign ranks (rank() semantics)
  let currentRank = 1;
  for (let i = 0; i < entryResults.length; i++) {
    if (i > 0) {
      const prev = entryResults[i - 1];
      const curr = entryResults[i];
      if (
        prev.totalPoints !== curr.totalPoints ||
        prev.exactHits !== curr.exactHits ||
        prev.winnerGdHits !== curr.winnerGdHits ||
        prev.firstSubmit !== curr.firstSubmit
      ) {
        currentRank = i + 1;
      }
    }
    entryResults[i].rank = currentRank;
  }

  // Identify rank-1 winners
  const winners = entryResults.filter((e) => e.rank === 1);

  // Allocate pot
  const potTotal = Number(wagerRound.pot_total_base_units ?? 0);
  const allocations = allocatePot(
    potTotal,
    winners.map((w) => ({
      userId: w.userId,
      walletPubkey: w.walletPubkeyBytes,
    })),
  );

  for (const w of entryResults) {
    const allocation = allocations.find((a) => a.userId === w.userId);
    w.awardBaseUnits = allocation?.awardBaseUnits ?? 0;
  }

  // Build Merkle tree for winners
  const merkleLeaves: MerkleLeaf[] = allocations.map((a) => ({
    winnerWalletBytes: a.walletPubkey,
    awardBaseUnits: a.awardBaseUnits,
  }));

  const wagerRoundPubkey = new Uint8Array(32); // Placeholder — actual PDA
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
