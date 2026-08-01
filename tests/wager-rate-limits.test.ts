import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The limiter is the only thing standing between a scripted client and
 * unbounded challenge/intent creation, so the cases that matter are: it counts
 * the right window, it denies at the boundary rather than past it, and an
 * unknown operation is not silently unlimited by typo.
 */

const mocks = vi.hoisted(() => ({
  createAdminSupabaseClient: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}));

const { checkRateLimit, recordRateLimitAttempt, RATE_LIMITS } = await import(
  "@/lib/wager/rate-limits"
);

/** Stand-in for the chained supabase-js builder used by the limiter. */
function makeAdmin({ count, error }: { count: number | null; error?: unknown }) {
  const captured: Record<string, unknown> = {};
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      captured[col] = val;
      return builder;
    },
    gte: (col: string, val: unknown) => {
      captured[col] = val;
      return Promise.resolve({ count, error: error ?? null });
    },
  };
  return {
    captured,
    client: {
      from: (table: string) => {
        captured.table = table;
        return { ...builder, insert: mocks.insert };
      },
    },
  };
}

beforeEach(() => {
  mocks.createAdminSupabaseClient.mockReset();
  mocks.insert.mockReset();
  mocks.insert.mockResolvedValue({ error: null });
});

describe("checkRateLimit", () => {
  it("allows a user below the limit and reports what is left", async () => {
    const { client } = makeAdmin({ count: 2 });
    mocks.createAdminSupabaseClient.mockReturnValue(client);

    const result = await checkRateLimit("u1", "wallet_challenge");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.wallet_challenge.maxRequests - 2);
  });

  it("denies once the count reaches the limit, not after it", async () => {
    const max = RATE_LIMITS.wallet_challenge.maxRequests;
    const { client } = makeAdmin({ count: max });
    mocks.createAdminSupabaseClient.mockReturnValue(client);

    const result = await checkRateLimit("u1", "wallet_challenge");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("queries its own ledger scoped to the user, operation and window", async () => {
    const { client, captured } = makeAdmin({ count: 0 });
    mocks.createAdminSupabaseClient.mockReturnValue(client);

    await checkRateLimit("u1", "wager_intent");

    expect(captured.table).toBe("wager_rate_limit_events");
    expect(captured.user_id).toBe("u1");
    expect(captured.operation).toBe("wager_intent");
    const windowStart = Date.parse(captured.observed_at as string);
    const expected = Date.now() - RATE_LIMITS.wager_intent.windowMs;
    expect(Math.abs(windowStart - expected)).toBeLessThan(5000);
  });

  it("denies an unknown operation rather than treating it as unlimited", async () => {
    const { client } = makeAdmin({ count: 0 });
    mocks.createAdminSupabaseClient.mockReturnValue(client);

    const result = await checkRateLimit("u1", "not_a_real_operation");
    expect(result.allowed).toBe(false);
  });

  it("fails closed when the ledger cannot be read", async () => {
    const { client } = makeAdmin({ count: null, error: { message: "boom" } });
    mocks.createAdminSupabaseClient.mockReturnValue(client);

    const result = await checkRateLimit("u1", "wallet_challenge");
    expect(result.allowed).toBe(false);
  });
});

describe("recordRateLimitAttempt", () => {
  it("appends one row for the user and operation", async () => {
    const { client } = makeAdmin({ count: 0 });
    mocks.createAdminSupabaseClient.mockReturnValue(client);

    await recordRateLimitAttempt("u1", "wallet_challenge");

    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: "u1",
      operation: "wallet_challenge",
    });
  });

  it("does not record attempts for an unknown operation", async () => {
    const { client } = makeAdmin({ count: 0 });
    mocks.createAdminSupabaseClient.mockReturnValue(client);

    await recordRateLimitAttempt("u1", "not_a_real_operation");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
