import { describe, expect, it } from "vitest";
import type { SettlementManifest } from "@/lib/wager/manifest";
import { canonicalManifestBytes, hashManifest } from "@/lib/wager/manifest-hash";

const wallet = (b: number) => new Uint8Array(32).fill(b);

function entry(overrides: Partial<SettlementManifest["entries"][number]> = {}) {
  return {
    entryId: "e1",
    userId: "u1",
    walletPubkeyBytes: wallet(1),
    pickCommitment: new Uint8Array(32).fill(0xaa),
    totalPoints: 10,
    exactHits: 2,
    winnerGdHits: 0,
    winnerHits: 0,
    firstSubmit: "2026-07-01T10:00:00.000Z",
    rank: 1,
    awardBaseUnits: 100,
    ...overrides,
  };
}

function manifest(overrides: Partial<SettlementManifest> = {}): SettlementManifest {
  return {
    version: 1,
    wagerRoundId: "11111111-1111-1111-1111-111111111111",
    roundId: "22222222-2222-2222-2222-222222222222",
    groupId: "33333333-3333-3333-3333-333333333333",
    fixtureResults: [
      { matchId: "m1", homeScore: 2, awayScore: 1, status: "final" },
      { matchId: "m2", homeScore: 0, awayScore: 0, status: "final" },
    ],
    entries: [entry()],
    merkleRoot: new Uint8Array(32).fill(0xbb),
    totalPot: 100,
    winnerCount: 1,
    generatedAt: "2026-07-02T12:00:00.000Z",
    ...overrides,
  };
}

describe("canonicalManifestBytes", () => {
  it("is stable under fixture and entry ordering", () => {
    const a = manifest({
      fixtureResults: [
        { matchId: "m1", homeScore: 2, awayScore: 1, status: "final" },
        { matchId: "m2", homeScore: 0, awayScore: 0, status: "final" },
      ],
      entries: [entry({ entryId: "e1", rank: 1 }), entry({ entryId: "e2", rank: 2 })],
    });
    const b = manifest({
      fixtureResults: [
        { matchId: "m2", homeScore: 0, awayScore: 0, status: "final" },
        { matchId: "m1", homeScore: 2, awayScore: 1, status: "final" },
      ],
      entries: [entry({ entryId: "e2", rank: 2 }), entry({ entryId: "e1", rank: 1 })],
    });

    expect(Buffer.from(canonicalManifestBytes(a))).toEqual(Buffer.from(canonicalManifestBytes(b)));
  });

  // The committed hash is only useful as an audit anchor if re-deriving the
  // manifest later reproduces it, which rules out wall-clock fields.
  it("ignores generatedAt", () => {
    const a = manifest({ generatedAt: "2026-07-02T12:00:00.000Z" });
    const b = manifest({ generatedAt: "2027-01-01T00:00:00.000Z" });
    expect(hashManifest(canonicalManifestBytes(a))).toEqual(
      hashManifest(canonicalManifestBytes(b)),
    );
  });

  it("changes when any settled value changes", () => {
    const base = hashManifest(canonicalManifestBytes(manifest()));

    const variants: SettlementManifest[] = [
      manifest({ totalPot: 101 }),
      manifest({ winnerCount: 2 }),
      manifest({ merkleRoot: new Uint8Array(32).fill(0xcc) }),
      manifest({ entries: [entry({ awardBaseUnits: 99 })] }),
      manifest({ entries: [entry({ rank: 2 })] }),
      manifest({ entries: [entry({ totalPoints: 11 })] }),
      manifest({ entries: [entry({ pickCommitment: new Uint8Array(32).fill(0xab) })] }),
      manifest({ entries: [entry({ walletPubkeyBytes: wallet(2) })] }),
      manifest({
        fixtureResults: [
          { matchId: "m1", homeScore: 3, awayScore: 1, status: "final" },
          { matchId: "m2", homeScore: 0, awayScore: 0, status: "final" },
        ],
      }),
    ];

    for (const variant of variants) {
      expect(hashManifest(canonicalManifestBytes(variant))).not.toEqual(base);
    }
  });
});

describe("hashManifest", () => {
  it("returns 32 bytes and is deterministic", () => {
    const bytes = canonicalManifestBytes(manifest());
    const first = hashManifest(bytes);
    expect(first.length).toBe(32);
    expect(hashManifest(bytes)).toEqual(first);
  });

  it("is domain-separated from a bare SHA-256 of the same bytes", async () => {
    const { createHash } = await import("node:crypto");
    const bytes = canonicalManifestBytes(manifest());
    const bare = new Uint8Array(createHash("sha256").update(Buffer.from(bytes)).digest());
    expect(hashManifest(bytes)).not.toEqual(bare);
  });
});
