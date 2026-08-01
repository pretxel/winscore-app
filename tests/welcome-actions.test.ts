import { describe, expect, it, vi } from "vitest";
import { recordWelcomeSeen } from "@/app/[locale]/welcome/actions";

/**
 * Idempotence is the property that matters: stepping backward through the tour
 * or re-submitting must not move the original timestamp, because it is the
 * record of when the player was actually shown the rules.
 */
function makeSupabase(existing: string | null) {
  // Typed parameter so `update.mock.calls[0][0]` is reachable — an inferred
  // zero-arg mock gives calls an empty-tuple type.
  const update = vi.fn((_values: { welcome_seen_at: string }) => ({
    eq: () => ({ is: () => Promise.resolve({ error: null }) }),
  }));
  const client = {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { welcome_seen_at: existing } }),
        }),
      }),
      update,
    })),
  };
  return { client, update };
}

describe("recordWelcomeSeen", () => {
  it("writes the timestamp when it is unset", async () => {
    const { client, update } = makeSupabase(null);
    await recordWelcomeSeen(client as never, "user-1");
    expect(update).toHaveBeenCalledTimes(1);
    expect(typeof update.mock.calls[0][0].welcome_seen_at).toBe("string");
  });

  it("does not overwrite an existing timestamp", async () => {
    const { client, update } = makeSupabase("2026-07-01T00:00:00Z");
    await recordWelcomeSeen(client as never, "user-1");
    expect(update).not.toHaveBeenCalled();
  });
});
