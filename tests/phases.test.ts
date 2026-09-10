import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { defaultPhase, phaseContaining, pickLabel, withDerivedEnds } from "@/lib/phases";

const P = (
  order: number,
  startsAt: string,
  status: "pending" | "active" | "closed" = "pending",
) => ({
  displayOrder: order,
  startsAt,
  status,
});

describe("withDerivedEnds", () => {
  it("gives each phase the next phase's start as its end, and leaves the last open", () => {
    const out = withDerivedEnds([
      P(2, "2026-11-05T00:00:00Z"),
      P(1, "2026-09-01T00:00:00Z"),
      P(3, "2027-01-28T00:00:00Z"),
    ]);
    expect(out.map((p) => p.displayOrder)).toEqual([1, 2, 3]);
    expect(out[0].endsAt).toBe("2026-11-05T00:00:00Z");
    expect(out[1].endsAt).toBe("2027-01-28T00:00:00Z");
    expect(out[2].endsAt).toBeNull();
  });

  it("handles a scheme with no phases and a scheme with one", () => {
    expect(withDerivedEnds([])).toEqual([]);
    const one = withDerivedEnds([P(1, "2026-09-01T00:00:00Z")]);
    expect(one[0].endsAt).toBeNull();
  });
});

describe("phaseContaining", () => {
  const phases = withDerivedEnds([
    P(1, "2026-09-01T00:00:00Z"),
    P(2, "2026-11-05T00:00:00Z"),
    P(3, "2027-01-28T00:00:00Z"),
  ]);

  it("uses a half-open window: the boundary instant belongs to the later phase", () => {
    expect(phaseContaining(phases, new Date("2026-11-04T23:59:59Z"))?.displayOrder).toBe(1);
    expect(phaseContaining(phases, new Date("2026-11-05T00:00:00Z"))?.displayOrder).toBe(2);
  });

  it("puts anything after the last start into the last phase", () => {
    expect(phaseContaining(phases, new Date("2028-01-01T00:00:00Z"))?.displayOrder).toBe(3);
  });

  it("returns null before the first phase", () => {
    expect(phaseContaining(phases, new Date("2026-08-01T00:00:00Z"))).toBeNull();
  });
});

describe("defaultPhase", () => {
  it("prefers the active phase", () => {
    const phases = [P(1, "a", "closed"), P(2, "b", "active"), P(3, "c", "pending")];
    expect(defaultPhase(phases)?.displayOrder).toBe(2);
  });

  it("falls back to the most recently closed phase when none is active", () => {
    const phases = [P(1, "a", "closed"), P(2, "b", "closed"), P(3, "c", "pending")];
    expect(defaultPhase(phases)?.displayOrder).toBe(2);
  });

  it("returns null when every phase is still pending or there are none", () => {
    expect(defaultPhase([P(1, "a"), P(2, "b")])).toBeNull();
    expect(defaultPhase([])).toBeNull();
  });
});

describe("pickLabel", () => {
  it("prefers the locale, then English, then the key", () => {
    expect(pickLabel({ en: "Phase 1", es: "Fase 1" }, "es", "phase-1")).toBe("Fase 1");
    expect(pickLabel({ en: "Phase 1" }, "fr", "phase-1")).toBe("Phase 1");
    expect(pickLabel({}, "de", "phase-1")).toBe("phase-1");
    expect(pickLabel(null, "en", "phase-1")).toBe("phase-1");
  });
});
