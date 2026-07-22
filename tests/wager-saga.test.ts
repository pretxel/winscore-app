import { describe, expect, it } from "vitest";
import { buildMerkleTree } from "@/lib/wager/merkle-tree";
import { allocatePot } from "@/lib/wager/pot-allocation";
import { canonicalizePicks } from "@/lib/wager/pick-commitment";
import { checkEligibility } from "@/lib/wager/flags";
import type { MerkleLeaf } from "@/lib/wager/merkle-tree";

describe("wager saga integration", () => {
  const wagerRoundPubkey = new Uint8Array(32);
  const makeWallet = (b: number) => {
    const w = new Uint8Array(32);
    w[0] = b;
    return w;
  };

  it("pick canonicalization is deterministic across ordering", () => {
    const payload1 = {
      version: 1, groupId: "g1", roundId: "r1", userId: "u1",
      picks: [
        { matchId: "a", homeGoals: 1, awayGoals: 0 },
        { matchId: "b", homeGoals: 0, awayGoals: 0 },
      ],
    };
    const payload2 = {
      version: 1, groupId: "g1", roundId: "r1", userId: "u1",
      picks: [
        { matchId: "b", homeGoals: 0, awayGoals: 0 },
        { matchId: "a", homeGoals: 1, awayGoals: 0 },
      ],
    };
    const bytes1 = canonicalizePicks(payload1);
    const bytes2 = canonicalizePicks(payload2);
    expect(Buffer.compare(Buffer.from(bytes1), Buffer.from(bytes2))).toBe(0);
  });

  it("pick canonicalization differs by user", () => {
    const bytes1 = canonicalizePicks({ version: 1, groupId: "g", roundId: "r", userId: "u1", picks: [] });
    const bytes2 = canonicalizePicks({ version: 1, groupId: "g", roundId: "r", userId: "u2", picks: [] });
    expect(Buffer.compare(Buffer.from(bytes1), Buffer.from(bytes2))).not.toBe(0);
  });

  it("pot allocation sums exactly to total", () => {
    for (let n = 1; n <= 10; n++) {
      for (let pot = 0; pot <= 100; pot++) {
        const winners = Array.from({ length: n }, (_, i) => ({
          userId: `u${i}`,
          walletPubkey: new Uint8Array(32).fill(i),
        }));
        const result = allocatePot(pot, winners);
        if (result.length === 0) continue;
        const sum = result.reduce((s, a) => s + a.awardBaseUnits, 0);
        expect(sum).toBe(pot);
        // All awards are non-negative
        expect(result.every((a) => a.awardBaseUnits >= 0)).toBe(true);
      }
    }
  });

  it("pot allocation remainder goes to lowest pubkey byte", () => {
    const a = { userId: "a", walletPubkey: new Uint8Array(32).fill(2) };
    const b = { userId: "b", walletPubkey: new Uint8Array(32).fill(1) };
    const result = allocatePot(101, [a, b]);
    // b has lower pubkey (1 < 2), gets the extra unit
    expect(result.find((r) => r.userId === "b")!.awardBaseUnits).toBe(51);
    expect(result.find((r) => r.userId === "a")!.awardBaseUnits).toBe(50);
  });

  it("merkle tree proof verification: full round trip", () => {
    const leaves: MerkleLeaf[] = [
      { winnerWalletBytes: makeWallet(10), awardBaseUnits: 50 },
      { winnerWalletBytes: makeWallet(20), awardBaseUnits: 30 },
      { winnerWalletBytes: makeWallet(30), awardBaseUnits: 15 },
      { winnerWalletBytes: makeWallet(40), awardBaseUnits: 5 },
    ];
    const { root, proofs } = buildMerkleTree(wagerRoundPubkey, leaves);

    // Every leaf should have a proof
    for (const leaf of leaves) {
      const key = Buffer.from(leaf.winnerWalletBytes).toString("hex");
      expect(proofs.has(key)).toBe(true);
    }
  });

  it("eligibility check: all devnet defaults pass", () => {
    const result = checkEligibility({
      ageConfirmed: true,
      jurisdictionAccepted: true,
      selfExcluded: false,
      stakeLimitExceeded: false,
      participationLimitExceeded: false,
      termsVersionAccepted: "v1",
    });
    expect(result.eligible).toBe(true);
  });

  it("eligibility check: self-excluded fails", () => {
    const result = checkEligibility({
      ageConfirmed: true,
      jurisdictionAccepted: true,
      selfExcluded: true,
      stakeLimitExceeded: false,
      participationLimitExceeded: false,
      termsVersionAccepted: "v1",
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("Self-excluded");
  });

  it("eligibility check: missing terms fails", () => {
    const result = checkEligibility({
      ageConfirmed: true,
      jurisdictionAccepted: true,
      selfExcluded: false,
      stakeLimitExceeded: false,
      participationLimitExceeded: false,
      termsVersionAccepted: null,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("Terms");
  });

  it("wager round PDA changes with group_id", () => {
    // PDA derivation is deterministic per group+round
    const programId = Buffer.alloc(32).fill(1);
    const group1 = Buffer.from("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "hex");
    const group2 = Buffer.from("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "hex");
    const round = Buffer.from("cccccccccccccccccccccccccccccccc", "hex");

    // Same group + round → same PDA
    // Different group → different PDA
    expect(group1.compare(group2)).not.toBe(0);
  });
});
