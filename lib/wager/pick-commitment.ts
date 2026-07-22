import canonicalize from "canonicalize";
import { createHash } from "crypto";

/**
 * A single match prediction in the canonicalization payload.
 * Match IDs are sorted by raw UUID bytes for deterministic ordering.
 */
export interface CanonicalPick {
  matchId: string;
  homeGoals: number;
  awayGoals: number;
}

/**
 * The complete payload for canonicalization and commitment hashing.
 * Version, group UUID, round UUID, user UUID, and ordered match picks.
 */
export interface PickCommitmentPayload {
  version: number;
  groupId: string;
  roundId: string;
  userId: string;
  picks: CanonicalPick[];
}

/**
 * Canonicalize a pick payload per RFC 8785 (canonical JSON).
 * Returns the canonical UTF-8 bytes.
 *
 * RFC 8785 ensures:
 * - Object keys are sorted
 * - Numbers are serialized without exponential notation
 * - No whitespace between tokens
 * - Strings use minimal escaping
 */
export function canonicalizePicks(payload: PickCommitmentPayload): Uint8Array {
  const obj = {
    version: payload.version,
    groupId: payload.groupId,
    roundId: payload.roundId,
    userId: payload.userId,
    picks: [...payload.picks]
      .sort((a, b) => {
        // Sort by matchId (UUID) bytes for deterministic ordering
        if (a.matchId < b.matchId) return -1;
        if (a.matchId > b.matchId) return 1;
        return 0;
      })
      .map((p) => ({
        matchId: p.matchId,
        homeGoals: p.homeGoals,
        awayGoals: p.awayGoals,
      })),
  };

  const canonical = canonicalize(obj);
  if (!canonical) {
    throw new Error("Failed to canonicalize pick payload");
  }

  return new TextEncoder().encode(canonical);
}

/**
 * Compute the SHA-256 pick commitment from a canonicalized payload.
 * Uses Node.js crypto for server-side computation.
 * On-chain stores only these 32 bytes — not the picks or personal data.
 */
export async function computePickCommitment(
  payload: PickCommitmentPayload,
): Promise<Uint8Array> {
  const bytes = canonicalizePicks(payload);
  const buf = createHash("sha256").update(Buffer.from(bytes)).digest();
  return new Uint8Array(buf);
}

/**
 * Synchronous SHA-256 from canonicalized payload.
 */
export function computePickCommitmentSync(
  payload: PickCommitmentPayload,
): Uint8Array {
  const bytes = canonicalizePicks(payload);
  const buf = createHash("sha256").update(Buffer.from(bytes)).digest();
  return new Uint8Array(buf);
}
