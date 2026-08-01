/**
 * Decides where a signed-in user belongs before they reach the app.
 *
 * Pure so it can be tested without stubbing Next's `redirect`, and so both
 * signed-in layouts share one definition of the rule rather than duplicating
 * the branch.
 */

export type OnboardingRedirect = "/onboarding" | "/welcome" | null;

export interface OnboardingState {
  displayName: string | null;
  welcomeSeenAt: string | null;
  /** The tour explains wagering, so it stays hidden while the feature is off. */
  wagerUiEnabled: boolean;
}

export function resolveOnboardingRedirect(input: OnboardingState): OnboardingRedirect {
  // A display name is required to appear on a leaderboard, so it gates first.
  if (!input.displayName) return "/onboarding";
  if (input.wagerUiEnabled && !input.welcomeSeenAt) return "/welcome";
  return null;
}
