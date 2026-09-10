import { describe, expect, it } from "vitest";
import { CATALOG_TAG, leagueTag, matchTag, NEWS_TAG } from "@/lib/cache-tags";

// These strings are a contract between cached readers and the writes that
// invalidate them. A drift here is silent stale content, so the exact values
// are pinned rather than derived in the test.

describe("cache tags", () => {
  it("names a league by its slug", () => {
    expect(leagueTag("la-liga-2026-2027")).toBe("league:la-liga-2026-2027");
    expect(leagueTag("world-cup-2026")).toBe("league:world-cup-2026");
  });

  it("names a match by its id", () => {
    expect(matchTag("9c50bac4-a023-4be5-8b3d-038c56f9b6e0")).toBe(
      "match:9c50bac4-a023-4be5-8b3d-038c56f9b6e0",
    );
  });

  it("keeps the two families apart", () => {
    expect(leagueTag("x")).not.toBe(matchTag("x"));
  });

  it("pins the fixed tags", () => {
    expect(CATALOG_TAG).toBe("catalog");
    expect(NEWS_TAG).toBe("news");
  });
});
