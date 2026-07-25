/**
 * Canonical serialization and hashing of a settlement manifest.
 *
 * The hash committed on chain is the audit anchor for a settled round: anyone
 * holding the manifest can recompute it and prove the published results are the
 * ones that were settled. That only holds if serialization is byte-stable, so
 * this module fixes key order, number formats, and byte encodings explicitly
 * rather than relying on `JSON.stringify` insertion order.
 */

import { createHash } from "node:crypto";
import type { SettlementManifest } from "./manifest";

const HASH_DOMAIN = "winscore-wager-manifest-v1";

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/**
 * Serialize a manifest to canonical bytes: fixed key order throughout, fixtures
 * sorted by match id, entries sorted by rank then entry id, and all byte strings
 * as lowercase hex.
 */
export function canonicalManifestBytes(manifest: SettlementManifest): Uint8Array {
  const canonical = {
    version: manifest.version,
    wagerRoundId: manifest.wagerRoundId,
    groupId: manifest.groupId,
    roundId: manifest.roundId,
    totalPot: manifest.totalPot,
    winnerCount: manifest.winnerCount,
    merkleRoot: toHex(manifest.merkleRoot),
    fixtureResults: [...manifest.fixtureResults]
      .sort((a, b) => a.matchId.localeCompare(b.matchId))
      .map((f) => ({
        matchId: f.matchId,
        homeScore: f.homeScore,
        awayScore: f.awayScore,
        status: f.status,
      })),
    entries: [...manifest.entries]
      .sort((a, b) => a.rank - b.rank || a.entryId.localeCompare(b.entryId))
      .map((e) => ({
        entryId: e.entryId,
        userId: e.userId,
        wallet: toHex(e.walletPubkeyBytes),
        pickCommitment: toHex(e.pickCommitment),
        totalPoints: e.totalPoints,
        exactHits: e.exactHits,
        winnerGdHits: e.winnerGdHits,
        winnerHits: e.winnerHits,
        firstSubmit: e.firstSubmit,
        rank: e.rank,
        awardBaseUnits: e.awardBaseUnits,
      })),
  };

  // `generatedAt` is deliberately excluded: re-deriving a manifest for an audit
  // must reproduce the same hash, and a wall-clock timestamp would prevent that.
  return new Uint8Array(Buffer.from(JSON.stringify(canonical), "utf8"));
}

/** 32-byte domain-separated SHA-256 over the canonical bytes. */
export function hashManifest(canonicalBytes: Uint8Array): Uint8Array {
  return new Uint8Array(
    createHash("sha256").update(HASH_DOMAIN).update(Buffer.from(canonicalBytes)).digest(),
  );
}
