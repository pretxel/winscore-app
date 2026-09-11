import { describe, expect, it } from "vitest";
import {
  ROUND_REMINDER_LEAD_MS,
  selectUpcomingRound,
  type UpcomingRound,
} from "@/lib/notifications/round-reminder-emails";

const NOW = new Date("2026-09-11T16:00:00.000Z");

function round(id: string, firstKickoff: string, label = id): UpcomingRound {
  return { id, label, firstKickoff };
}

describe("selectUpcomingRound", () => {
  it("picks the round whose first kickoff is inside the lead window", () => {
    const picked = selectUpcomingRound(
      [round("r2", "2026-09-12T14:00:00.000Z", "Matchday 2")],
      NOW,
    );
    expect(picked?.label).toBe("Matchday 2");
  });

  it("ignores a round that has already kicked off", () => {
    // The daily reminder owns "today"; a matchday already under way is not
    // coming up, even if later fixtures in it are still open.
    expect(selectUpcomingRound([round("r1", "2026-09-11T15:59:00.000Z")], NOW)).toBeNull();
  });

  it("ignores a round further out than the lead window", () => {
    expect(selectUpcomingRound([round("r3", "2026-09-13T10:00:00.000Z")], NOW)).toBeNull();
  });

  it("includes a round starting exactly at the window edge", () => {
    const edge = new Date(NOW.getTime() + ROUND_REMINDER_LEAD_MS).toISOString();
    expect(selectUpcomingRound([round("r4", edge)], NOW)?.id).toBe("r4");
  });

  it("prefers the earliest round when two start inside the window", () => {
    // Two competitions' matchdays landing on the same weekend is ordinary. A
    // player should be asked about the one in front of them first.
    const picked = selectUpcomingRound(
      [
        round("later", "2026-09-12T15:00:00.000Z", "Champions Matchday 2"),
        round("sooner", "2026-09-12T09:00:00.000Z", "Jornada 4"),
      ],
      NOW,
    );
    expect(picked?.label).toBe("Jornada 4");
  });

  it("drops a round with an unparseable kickoff instead of throwing", () => {
    expect(selectUpcomingRound([round("bad", "not-a-date")], NOW)).toBeNull();
  });

  it("returns null when there are no rounds at all", () => {
    expect(selectUpcomingRound([], NOW)).toBeNull();
  });

  it("catches every round exactly once across consecutive daily runs", () => {
    // The window is one day wide and the cron fires once a day, so a round is
    // selected by exactly one run: never missed, never repeated.
    const kickoff = "2026-09-14T18:30:00.000Z";
    const rounds = [round("r", kickoff)];
    const hits = [0, 1, 2, 3, 4]
      .map((day) => new Date(NOW.getTime() + day * ROUND_REMINDER_LEAD_MS))
      .filter((at) => selectUpcomingRound(rounds, at) !== null);
    expect(hits).toHaveLength(1);
  });
});
