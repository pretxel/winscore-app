import { describe, expect, it } from "vitest";
import {
  buildRoundProgress,
  type RoundProgress,
  selectRoundWindow,
} from "@/lib/groups/round-progress";

const NOW = new Date("2026-08-02T12:00:00Z");

function match(id: string, roundId: string, kickoff: string) {
  return {
    id,
    round_id: roundId,
    home_team: `Home ${id}`,
    away_team: `Away ${id}`,
    kickoff_at: kickoff,
  };
}

const ROUNDS = [
  { id: "r1", round_key: "Jornada 1", round_number: 1, labels: { es: "Jornada 1" } },
  { id: "r2", round_key: "Jornada 2", round_number: 2, labels: null },
];

describe("buildRoundProgress", () => {
  it("counts predictions and leaves unpredicted future fixtures open", () => {
    const [round] = buildRoundProgress({
      rounds: [ROUNDS[0]],
      matches: [
        match("m1", "r1", "2026-08-10T18:00:00Z"),
        match("m2", "r1", "2026-08-10T20:00:00Z"),
      ],
      predictedMatchIds: new Set(["m1"]),
      wagerRoundIds: new Set(),
      locale: "en",
      now: NOW,
    });

    expect(round.total).toBe(2);
    expect(round.predicted).toBe(1);
    expect(round.openMatches.map((m) => m.id)).toEqual(["m2"]);
    expect(round.lockedUnpredicted).toBe(0);
    expect(round.state).toBe("open");
  });

  // The kickoff lock is enforced by RLS, so a started fixture must never be
  // offered as something the member can still fill in.
  it("counts a started unpredicted fixture as locked, not open", () => {
    const [round] = buildRoundProgress({
      rounds: [ROUNDS[0]],
      matches: [
        match("m1", "r1", "2026-08-01T18:00:00Z"),
        match("m2", "r1", "2026-08-10T20:00:00Z"),
      ],
      predictedMatchIds: new Set(),
      wagerRoundIds: new Set(),
      locale: "en",
      now: NOW,
    });

    expect(round.openMatches.map((m) => m.id)).toEqual(["m2"]);
    expect(round.lockedUnpredicted).toBe(1);
    expect(round.state).toBe("in_progress");
  });

  it("marks a round past once every fixture has started", () => {
    const [round] = buildRoundProgress({
      rounds: [ROUNDS[0]],
      matches: [
        match("m1", "r1", "2026-07-20T18:00:00Z"),
        match("m2", "r1", "2026-07-21T20:00:00Z"),
      ],
      predictedMatchIds: new Set(["m1", "m2"]),
      wagerRoundIds: new Set(),
      locale: "en",
      now: NOW,
    });

    expect(round.state).toBe("past");
    expect(round.openMatches).toEqual([]);
  });

  it("prefers the localized label and falls back to round_key", () => {
    const rounds = buildRoundProgress({
      rounds: ROUNDS,
      matches: [
        match("m1", "r1", "2026-08-10T18:00:00Z"),
        match("m2", "r2", "2026-08-17T18:00:00Z"),
      ],
      predictedMatchIds: new Set(),
      wagerRoundIds: new Set(),
      locale: "es",
      now: NOW,
    });

    expect(rounds[0].label).toBe("Jornada 1");
    expect(rounds[1].label).toBe("Jornada 2");
  });

  it("reports the fixture window and flags wager-enabled rounds", () => {
    const [round] = buildRoundProgress({
      rounds: [ROUNDS[0]],
      matches: [
        match("m2", "r1", "2026-08-12T20:00:00Z"),
        match("m1", "r1", "2026-08-10T18:00:00Z"),
      ],
      predictedMatchIds: new Set(),
      wagerRoundIds: new Set(["r1"]),
      locale: "en",
      now: NOW,
    });

    expect(round.startsAt).toBe("2026-08-10T18:00:00Z");
    expect(round.endsAt).toBe("2026-08-12T20:00:00Z");
    expect(round.wagerAvailable).toBe(true);
  });

  it("skips rounds that have no fixtures assigned", () => {
    const rounds = buildRoundProgress({
      rounds: ROUNDS,
      matches: [match("m1", "r1", "2026-08-10T18:00:00Z")],
      predictedMatchIds: new Set(),
      wagerRoundIds: new Set(),
      locale: "en",
      now: NOW,
    });

    expect(rounds.map((r) => r.roundId)).toEqual(["r1"]);
  });

  it("orders open fixtures by kickoff", () => {
    const [round] = buildRoundProgress({
      rounds: [ROUNDS[0]],
      matches: [
        match("late", "r1", "2026-08-12T20:00:00Z"),
        match("early", "r1", "2026-08-10T18:00:00Z"),
      ],
      predictedMatchIds: new Set(),
      wagerRoundIds: new Set(),
      locale: "en",
      now: NOW,
    });

    expect(round.openMatches.map((m) => m.id)).toEqual(["early", "late"]);
  });
});

function progress(roundNumber: number, state: RoundProgress["state"]): RoundProgress {
  return {
    roundId: `r${roundNumber}`,
    label: `Jornada ${roundNumber}`,
    roundNumber,
    startsAt: "2026-08-10T18:00:00Z",
    endsAt: "2026-08-10T20:00:00Z",
    total: 9,
    predicted: 0,
    openMatches: [],
    lockedUnpredicted: 0,
    state,
    wagerAvailable: false,
  };
}

describe("selectRoundWindow", () => {
  it("shows in-progress and open rounds, capped at three", () => {
    const { actionable, past } = selectRoundWindow([
      progress(1, "past"),
      progress(2, "past"),
      progress(3, "in_progress"),
      progress(4, "open"),
      progress(5, "open"),
      progress(6, "open"),
    ]);

    expect(actionable.map((r) => r.roundNumber)).toEqual([3, 4, 5]);
    expect(past.map((r) => r.roundNumber)).toEqual([2, 1]);
  });

  // End of season: an empty section would read as a bug rather than as "done".
  it("falls back to the three most recent past rounds when nothing is open", () => {
    const { actionable, past } = selectRoundWindow([
      progress(1, "past"),
      progress(2, "past"),
      progress(3, "past"),
      progress(4, "past"),
    ]);

    expect(actionable.map((r) => r.roundNumber)).toEqual([4, 3, 2]);
    expect(past.map((r) => r.roundNumber)).toEqual([1]);
  });

  it("returns nothing for a competition with no rounds", () => {
    expect(selectRoundWindow([])).toEqual({ actionable: [], past: [] });
  });
});
