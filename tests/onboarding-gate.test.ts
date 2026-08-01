import { describe, expect, it } from "vitest";
import { resolveOnboardingRedirect } from "@/lib/onboarding/gate";

describe("resolveOnboardingRedirect", () => {
  it("sends a user with no display name to onboarding", () => {
    expect(
      resolveOnboardingRedirect({
        displayName: null,
        welcomeSeenAt: null,
        wagerUiEnabled: true,
      }),
    ).toBe("/onboarding");
  });

  // The display name is a hard gate, so it wins even when the tour is also unseen.
  it("prefers onboarding over the tour when both are pending", () => {
    expect(
      resolveOnboardingRedirect({
        displayName: "",
        welcomeSeenAt: null,
        wagerUiEnabled: true,
      }),
    ).toBe("/onboarding");
  });

  it("sends a named user who has not seen the tour to welcome", () => {
    expect(
      resolveOnboardingRedirect({
        displayName: "Ada",
        welcomeSeenAt: null,
        wagerUiEnabled: true,
      }),
    ).toBe("/welcome");
  });

  // With wagering off the tour would explain a feature that is not there.
  it("skips the tour when the wager UI is disabled", () => {
    expect(
      resolveOnboardingRedirect({
        displayName: "Ada",
        welcomeSeenAt: null,
        wagerUiEnabled: false,
      }),
    ).toBeNull();
  });

  it("lets a fully onboarded user through", () => {
    expect(
      resolveOnboardingRedirect({
        displayName: "Ada",
        welcomeSeenAt: "2026-08-01T00:00:00Z",
        wagerUiEnabled: true,
      }),
    ).toBeNull();
  });
});
