import { describe, expect, it } from "vitest";
import type { CompetitionFormat } from "@/lib/competition-schema";
import { resolveStageMultiplier, STAGE_POINT_MULTIPLIER, scorePrediction } from "@/lib/scoring";
import { allocatePot, verifyPotConservation } from "@/lib/wager/pot-allocation";

const stageDefaults = {
  hasGroupCode: false,
  revealed: false,
  tiebreaker: "gd" as const,
};

function stubFormat(
  stages: Array<{
    key: string;
    kind: "group" | "knockout" | "league";
    order: number;
    labels?: Record<string, string>;
    pointMultiplier?: number;
  }>,
): CompetitionFormat {
  return {
    stages: stages.map((s) => ({ ...stageDefaults, labels: {}, ...s })),
    groups: { enabled: false },
  };
}

describe("scorePrediction", () => {
  it("awards 5 points and 'exact' for matching scores", () => {
    expect(
      scorePrediction({ home_goals: 2, away_goals: 1 }, { home_score: 2, away_score: 1 }),
    ).toEqual({
      points: 5,
      hit_type: "exact",
    });
  });

  it("awards 3 points and 'winner_gd' for correct winner + same goal diff", () => {
    expect(
      scorePrediction({ home_goals: 2, away_goals: 1 }, { home_score: 3, away_score: 2 }),
    ).toEqual({
      points: 3,
      hit_type: "winner_gd",
    });
  });

  it("awards 3 points and 'winner_gd' for matching draws", () => {
    expect(
      scorePrediction({ home_goals: 1, away_goals: 1 }, { home_score: 2, away_score: 2 }),
    ).toEqual({
      points: 3,
      hit_type: "winner_gd",
    });
  });

  it("awards 1 point and 'winner' for correct winner but wrong goal diff", () => {
    expect(
      scorePrediction({ home_goals: 3, away_goals: 0 }, { home_score: 3, away_score: 1 }),
    ).toEqual({
      points: 1,
      hit_type: "winner",
    });
  });

  it("awards 0 points and 'miss' when the winner is wrong", () => {
    expect(
      scorePrediction({ home_goals: 2, away_goals: 1 }, { home_score: 1, away_score: 2 }),
    ).toEqual({
      points: 0,
      hit_type: "miss",
    });
  });

  it("awards 0 points and 'miss' when predicting a draw but a team wins", () => {
    expect(
      scorePrediction({ home_goals: 1, away_goals: 1 }, { home_score: 2, away_score: 1 }),
    ).toEqual({
      points: 0,
      hit_type: "miss",
    });
  });

  it("awards 0 points and 'miss' when predicting a winner but the match draws", () => {
    expect(
      scorePrediction({ home_goals: 2, away_goals: 1 }, { home_score: 1, away_score: 1 }),
    ).toEqual({
      points: 0,
      hit_type: "miss",
    });
  });

  it("scales an exact pick in the final by ×10 (5 → 50)", () => {
    expect(
      scorePrediction({ home_goals: 2, away_goals: 1 }, { home_score: 2, away_score: 1 }, "final"),
    ).toEqual({ points: 50, hit_type: "exact" });
  });

  it("scales a winner+GD pick in the Round of 32 by ×2 (3 → 6)", () => {
    expect(
      scorePrediction({ home_goals: 2, away_goals: 1 }, { home_score: 3, away_score: 2 }, "r32"),
    ).toEqual({ points: 6, hit_type: "winner_gd" });
  });

  it("keeps group-stage points at the base (×1)", () => {
    expect(
      scorePrediction({ home_goals: 2, away_goals: 1 }, { home_score: 2, away_score: 1 }, "group"),
    ).toEqual({ points: 5, hit_type: "exact" });
    expect(
      scorePrediction({ home_goals: 3, away_goals: 0 }, { home_score: 3, away_score: 1 }, "group"),
    ).toEqual({ points: 1, hit_type: "winner" });
  });

  it("scores a miss as 0 regardless of stage", () => {
    for (const stage of ["group", "r32", "r16", "qf", "sf", "final", "third"]) {
      expect(
        scorePrediction({ home_goals: 2, away_goals: 1 }, { home_score: 1, away_score: 2 }, stage),
      ).toEqual({ points: 0, hit_type: "miss" });
    }
  });

  it("defaults to ×1 for an unknown/unmapped stage", () => {
    expect(
      scorePrediction(
        { home_goals: 2, away_goals: 1 },
        { home_score: 2, away_score: 1 },
        "totally-unknown",
      ),
    ).toEqual({ points: 5, hit_type: "exact" });
  });
});

describe("STAGE_POINT_MULTIPLIER", () => {
  it("matches the agreed per-stage factors", () => {
    expect(STAGE_POINT_MULTIPLIER).toEqual({
      group: 1,
      r32: 2,
      r16: 4,
      qf: 6,
      sf: 8,
      final: 10,
      third: 4,
    });
  });
});

describe("resolveStageMultiplier", () => {
  it("returns hardcoded ×6 for 'qf' when no format config", () => {
    expect(resolveStageMultiplier("qf")).toBe(6);
  });

  it("returns ×1 for unknown stage", () => {
    expect(resolveStageMultiplier("unknown")).toBe(1);
  });

  it("returns ×1 for empty stage", () => {
    expect(resolveStageMultiplier("")).toBe(1);
  });

  it("prefers configured pointMultiplier over hardcoded", () => {
    const format = stubFormat([{ key: "group", kind: "group", order: 1, pointMultiplier: 2 }]);
    expect(resolveStageMultiplier("group", format)).toBe(2);
    expect(resolveStageMultiplier("group")).toBe(1);
  });

  it("returns hardcoded fallback when format has no matching stage", () => {
    const format = stubFormat([{ key: "group", kind: "group", order: 1 }]);
    expect(resolveStageMultiplier("qf", format)).toBe(6);
  });
});

describe("scorePrediction — boundary cases", () => {
  it("handles 0-0 exact prediction", () => {
    expect(
      scorePrediction({ home_goals: 0, away_goals: 0 }, { home_score: 0, away_score: 0 }),
    ).toEqual({ points: 5, hit_type: "exact" });
  });

  it("handles max goal bounds (20-20)", () => {
    expect(
      scorePrediction({ home_goals: 20, away_goals: 20 }, { home_score: 20, away_score: 20 }),
    ).toEqual({ points: 5, hit_type: "exact" });
  });

  it("*12 multiplier produces correct scaled values", () => {
    const format = stubFormat([{ key: "final", kind: "knockout", order: 1, pointMultiplier: 12 }]);
    expect(
      scorePrediction(
        { home_goals: 2, away_goals: 1 },
        { home_score: 2, away_score: 1 },
        "final",
        format,
      ),
    ).toEqual({ points: 60, hit_type: "exact" });
  });
});

describe("potAllocation", () => {
  const makePubkey = (firstByte: number) => {
    const key = new Uint8Array(32);
    key[0] = firstByte;
    return key;
  };

  it("even split with no remainder", () => {
    const winners = [
      { userId: "a", walletPubkey: makePubkey(1) },
      { userId: "b", walletPubkey: makePubkey(2) },
    ];
    const result = allocatePot(100, winners);
    expect(result.map((w) => w.awardBaseUnits)).toEqual([50, 50]);
    expect(verifyPotConservation(100, result)).toBe(true);
  });

  it("split with remainder, pubkey order determines extra unit", () => {
    const winners = [
      { userId: "b", walletPubkey: makePubkey(2) },
      { userId: "a", walletPubkey: makePubkey(1) },
    ];
    const result = allocatePot(101, winners);
    const a = result.find((w) => w.userId === "a")!;
    const b = result.find((w) => w.userId === "b")!;
    expect(a.awardBaseUnits).toBe(51);
    expect(b.awardBaseUnits).toBe(50);
    expect(verifyPotConservation(101, result)).toBe(true);
  });

  it("three winners with remainder", () => {
    const winners = [
      { userId: "c", walletPubkey: makePubkey(3) },
      { userId: "a", walletPubkey: makePubkey(1) },
      { userId: "b", walletPubkey: makePubkey(2) },
    ];
    const result = allocatePot(10, winners);
    expect(result[0].userId).toBe("a");
    expect(result[0].awardBaseUnits).toBe(4);
    expect(result[1].awardBaseUnits).toBe(3);
    expect(result[2].awardBaseUnits).toBe(3);
    expect(verifyPotConservation(10, result)).toBe(true);
  });

  it("empty winners returns empty", () => {
    expect(allocatePot(100, [])).toEqual([]);
  });

  it("single winner gets full pot", () => {
    const result = allocatePot(77, [{ userId: "solo", walletPubkey: makePubkey(0) }]);
    expect(result[0].awardBaseUnits).toBe(77);
    expect(verifyPotConservation(77, result)).toBe(true);
  });

  it("zero pot gives zero awards", () => {
    const winners = [
      { userId: "a", walletPubkey: makePubkey(1) },
      { userId: "b", walletPubkey: makePubkey(2) },
    ];
    const result = allocatePot(0, winners);
    expect(result.every((w) => w.awardBaseUnits === 0)).toBe(true);
    expect(verifyPotConservation(0, result)).toBe(true);
  });
});
