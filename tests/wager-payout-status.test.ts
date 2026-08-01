import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getPayoutStatus decides whether a member is shown money they can withdraw, so
 * the cases that matter are the ones where it must stay silent (no award) and
 * the ones where it must not (settled winner, cancelled round) — including after
 * the payout already landed, which still has to render a receipt.
 */

type Row = Record<string, unknown> | null;

/** Minimal stand-in for the chained supabase-js query builder. */
function makeAdmin(tables: Record<string, Row>) {
  const from = vi.fn((table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: async () => ({ data: tables[table] ?? null }),
    };
    return builder;
  });
  return { from };
}

const mocks = vi.hoisted(() => ({ createAdminSupabaseClient: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}));

const { getPayoutStatus } = await import("@/lib/wager/payout-status");

function withTables(tables: Record<string, Row>) {
  mocks.createAdminSupabaseClient.mockReturnValue(makeAdmin(tables));
}

beforeEach(() => {
  mocks.createAdminSupabaseClient.mockReset();
});

describe("getPayoutStatus", () => {
  it("returns null when the round has no wager", async () => {
    withTables({ wager_rounds: null });
    expect(await getPayoutStatus("g", "r", "u")).toBeNull();
  });

  it("returns null while the round is still open for entry", async () => {
    withTables({ wager_rounds: { id: "wr1", state: "initialized", verified_decimals: 6 } });
    expect(await getPayoutStatus("g", "r", "u")).toBeNull();
  });

  it("offers a refund on a cancelled round, scaled by decimals", async () => {
    withTables({
      wager_rounds: { id: "wr1", state: "cancelled", verified_decimals: 6 },
      wager_entries: { state: "cancelled", stake_base_units: "1000000" },
    });
    expect(await getPayoutStatus("g", "r", "u")).toEqual({
      kind: "refund",
      targetId: "wr1",
      amountDisplay: "1",
      alreadySettled: false,
    });
  });

  it("still renders a refund that already landed, so the receipt survives", async () => {
    withTables({
      wager_rounds: { id: "wr1", state: "cancelled", verified_decimals: 6 },
      wager_entries: { state: "refunded", stake_base_units: "1000000" },
    });
    const result = await getPayoutStatus("g", "r", "u");
    expect(result?.alreadySettled).toBe(true);
  });

  it("returns null on a cancelled round the member never entered", async () => {
    withTables({
      wager_rounds: { id: "wr1", state: "cancelled", verified_decimals: 6 },
      wager_entries: null,
    });
    expect(await getPayoutStatus("g", "r", "u")).toBeNull();
  });

  it("offers a claim to a winner of a settled round", async () => {
    withTables({
      wager_rounds: { id: "wr1", state: "settled", verified_decimals: 6 },
      wager_settlements: { id: "s1", settled_at: "2026-08-01T00:00:00Z" },
      wager_claims: { state: "pending", award_base_units: "2500000" },
    });
    expect(await getPayoutStatus("g", "r", "u")).toEqual({
      kind: "claim",
      targetId: "s1",
      amountDisplay: "2.5",
      alreadySettled: false,
    });
  });

  it("returns null for a non-winner of a settled round", async () => {
    withTables({
      wager_rounds: { id: "wr1", state: "settled", verified_decimals: 6 },
      wager_settlements: { id: "s1", settled_at: "2026-08-01T00:00:00Z" },
      wager_claims: null,
    });
    expect(await getPayoutStatus("g", "r", "u")).toBeNull();
  });

  it("returns null when settlement was recorded but never sent on chain", async () => {
    withTables({
      wager_rounds: { id: "wr1", state: "settled", verified_decimals: 6 },
      wager_settlements: { id: "s1", settled_at: null },
      wager_claims: { state: "pending", award_base_units: "2500000" },
    });
    expect(await getPayoutStatus("g", "r", "u")).toBeNull();
  });
});
