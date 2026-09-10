import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The "predict the next one" suggestion offered after a pick is saved.

const matchRows: Record<string, unknown>[] = [];
const pickRows: { match_id: string }[] = [];

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "matches") {
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: () => chain,
          gt: () => chain,
          order: () => chain,
          limit: async () => ({ data: matchRows, error: null }),
        };
        return chain;
      }
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        in: async () => ({ data: pickRows, error: null }),
      };
      return chain;
    },
  })),
}));

const HOUR = 60 * 60_000;
function match(id: string, hoursAhead: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    home_team: `Home ${id}`,
    away_team: `Away ${id}`,
    kickoff_at: new Date(Date.now() + hoursAhead * HOUR).toISOString(),
    status: "scheduled",
    ...overrides,
  };
}

async function load() {
  return import("@/lib/next-pick");
}

beforeEach(() => {
  matchRows.length = 0;
  pickRows.length = 0;
});
afterEach(() => vi.clearAllMocks());

describe("getNextPickableMatch", () => {
  it("suggests the soonest other fixture the user has not picked", async () => {
    matchRows.push(match("current", 1), match("next", 2), match("later", 3));
    const { getNextPickableMatch } = await load();
    const out = await getNextPickableMatch("la-liga", "comp-1", "u1", "current");
    expect(out?.id).toBe("next");
    expect(out?.homeTeam).toBe("Home next");
  });

  it("never suggests the match the user is already on", async () => {
    matchRows.push(match("current", 1));
    const { getNextPickableMatch } = await load();
    expect(await getNextPickableMatch("la-liga", "comp-1", "u1", "current")).toBeNull();
  });

  it("skips fixtures the user has already predicted", async () => {
    matchRows.push(match("current", 1), match("next", 2), match("later", 3));
    pickRows.push({ match_id: "next" });
    const { getNextPickableMatch } = await load();
    expect((await getNextPickableMatch("la-liga", "comp-1", "u1", "current"))?.id).toBe("later");
  });

  it("skips unconfirmed knockout placeholders", async () => {
    matchRows.push(
      match("current", 1),
      match("placeholder", 2, { home_team: "Winner Group A", away_team: "Runner-up Group B" }),
      match("real", 3),
    );
    const { getNextPickableMatch } = await load();
    expect((await getNextPickableMatch("la-liga", "comp-1", "u1", "current"))?.id).toBe("real");
  });

  it("offers nothing when signed out, without reading anything", async () => {
    matchRows.push(match("next", 2));
    const { getNextPickableMatch } = await load();
    expect(await getNextPickableMatch("la-liga", "comp-1", null, "current")).toBeNull();
  });

  it("offers nothing when every remaining fixture is picked", async () => {
    matchRows.push(match("current", 1), match("next", 2));
    pickRows.push({ match_id: "next" });
    const { getNextPickableMatch } = await load();
    expect(await getNextPickableMatch("la-liga", "comp-1", "u1", "current")).toBeNull();
  });
});
